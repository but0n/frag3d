function webglMixin(frag3d) {
    frag3d.pixelRatio = window.devicePixelRatio;
    frag3d.prototype.id = null;
    frag3d.prototype.renderer = null;
    frag3d.prototype.gl = null; // WebGL Context
    // Renderer size set & get

    // Initial method
    frag3d.prototype.initWebgl = function(id) {
        this.id = id;
        this.renderer = document.getElementById(id);
        this.gl = this.renderer.getContext('webgl');
        this.gl.getExtension("OES_standard_derivatives"); // TBN required
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
    }


// WebGL stuff

    // Compile shader
    frag3d.prototype.getShader = function(code, type) {
        let gl = this.gl;
        let shader = gl.createShader(type);
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS) === true)
            return shader;
        else
            return console.warn(gl.getShaderInfoLog(shader));
    }

    frag3d.prototype.getShaderByID = function(id) {
        let gl = this.gl;
        let dom = document.getElementById(id);
        if(dom.type === 'x-shader/x-vertex') {
            return this.getShader(dom.text, gl.VERTEX_SHADER);
        } else if(dom.type === 'x-shader/x-fragment') {
            return this.getShader(dom.text, gl.FRAGMENT_SHADER);
        }
    }

    frag3d.prototype.getUnifSetter = function(type) {
        switch(type) {
            case this.gl.FLOAT:
                return 'uniform1f';
            case this.gl.FLOAT_VEC2:
                return 'uniform2f';
            case this.gl.FLOAT_VEC3:
                return 'uniform3f';
            case this.gl.FLOAT_VEC4:
                return 'uniform4f';

            case this.gl.INT:
                return 'uniform1i';
            case this.gl.INT_VEC2:
                return 'uniform2i';
            case this.gl.INT_VEC3:
                return 'uniform3i';
            case this.gl.INT_VEC4:
                return 'uniform4i';

            // case this.gl.BOOL:
            //     return this.gl.uniform1f;
            // case this.gl.BOOL_VEC2:
            //     return this.gl.uniform1f;
            // case this.gl.BOOL_VEC3:
            //     return this.gl.uniform1f;
            // case this.gl.BOOL_VEC4:
            //     return this.gl.uniform1f;

            case this.gl.FLOAT_MAT2:
                return 'uniformMatrix2fv';
            case this.gl.FLOAT_MAT3:
                return 'uniformMatrix3fv';
            case this.gl.FLOAT_MAT4:
                return 'uniformMatrix4fv';

            case this.gl.SAMPLER_2D:
                return 'uniform1i';
            case this.gl.SAMPLER_CUBE:
                return 'uniform1i';
        }
    }

    frag3d.prototype.useShader = function(s1, s2) {
        let gl = this.gl;
        let shader = gl.createProgram();
        gl.attachShader(shader, s1);
        gl.attachShader(shader, s2);
        gl.linkProgram(shader);
        gl.useProgram(shader);
        return this.setupShader(shader);
    }

    frag3d.prototype.useShaderByID = function(id1, id2) {
        return this.useShader(this.getShaderByID(id1), this.getShaderByID(id2));
    }

    frag3d.prototype.setupShader = function(shader) {
        const obj = {};
        obj.program = shader;
        const attrAmount = this.gl.getProgramParameter(shader, this.gl.ACTIVE_ATTRIBUTES);
        for(let i = 0; i < attrAmount; i++) {
            const {name} = this.gl.getActiveAttrib(shader, i);
            const loc = obj[name] = this.gl.getAttribLocation(shader, name);
            const ob = {};
            ob.get = () => i;
            ob.set = data => {
                this.bindAttribute(loc, ...data);
            }
            Object.defineProperty(obj, name, ob);

        }
        const unifAmount = this.gl.getProgramParameter(shader, this.gl.ACTIVE_UNIFORMS);
        for(let i = 0; i < unifAmount; i++) {
            const {name, type} = this.gl.getActiveUniform(shader, i);
            const loc = obj[name] = this.gl.getUniformLocation(shader, name);
            const setter = this.getUnifSetter(type);
            const ob = {};
            ob.get = () => i;
            ob.set = data => {
                if(this.gl[setter].length == 3)
                    this.gl[setter](loc, false, data)
                else
                    this.gl[setter](loc, data);
            }
            Object.defineProperty(obj, name, ob);

        }
        return obj;
    }

    frag3d.prototype.bindAttribute = function(attr, data, chunkSize, type) {
        let buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buf);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        this.gl.vertexAttribPointer(attr, chunkSize, type, false, 0, 0);
        this.gl.enableVertexAttribArray(attr);
    }

    frag3d.prototype.bindBuffer = function(data, type) {
        let buf = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buf);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, type);
    }

    frag3d.prototype.bindTexture = function(src, channel) {
        let gl = this.gl;
        let target  = new Image();
        let tex     = gl.createTexture();
        target.src  = src;
        target.onload = () => {
            gl.activeTexture([
                gl.TEXTURE0,
                gl.TEXTURE1,
                gl.TEXTURE2,
                gl.TEXTURE3,
                gl.TEXTURE4,
                gl.TEXTURE5,
                gl.TEXTURE6,
                gl.TEXTURE7
            ][channel]);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // Configure
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, target);
        }
    }

    frag3d.prototype.bindCubeTexture = function(path, channel) {
        let gl = this.gl;
        let cubetex = gl.createTexture();
        let counter = 0;
        for(let _=0;_<6;_++) {
            let p = new Image();
            p.src = path + ['negx.jpg','negy.jpg','negz.jpg','posx.jpg','posy.jpg','posz.jpg'][_];
            let glFlag = [
                gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
                gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Z
            ];
            p.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubetex);
                gl.texImage2D(glFlag[_], 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, p);

                counter++;
                if(counter==6) { // All set
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.activeTexture([
                        gl.TEXTURE0,
                        gl.TEXTURE1,
                        gl.TEXTURE2,
                        gl.TEXTURE3,
                        gl.TEXTURE4,
                        gl.TEXTURE5,
                        gl.TEXTURE6,
                        gl.TEXTURE7
                    ][channel]);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubetex);

                }
            }
        }
    }

    frag3d.prototype.ss_render = function() { // Screen space render
        let gl = this.gl;
        gl.clearColor(0,0,0,1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ADD);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_COLOR_BIT);

        let shader = this.useShaderByID(
            'gpgpu-vs',
            'gpgpu-fs',
            ['a_Position', 'a_texCoord'],
        );
        this.mainShader = shader;

        shader.a_Position = [new Float32Array([  // Vertex Postion
            -1, 1, 0.0,
            1, 1, 0.0,
            1, -1, 0.0,
            -1, -1, 0.0
        ]), 3, gl.FLOAT];
        shader.a_texCoord = [new Float32Array([  // TexCoord
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0,
            0.0, 0.0
        ]), 2, gl.FLOAT];

        this.bindBuffer(new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]), gl.STATIC_DRAW);

        let sampler = [];
        let size = 4096*2;
        for(let i = 0; i < size; i++) {
            sampler.push(255*Math.random(), 255*Math.random(), 255*Math.random());
        }
        this.genTexture(0, 0, gl.RGB, size, 1, 0, gl.UNSIGNED_BYTE, new Uint8Array(sampler));
        // gl.uniform1i(shader.data, 0);
        shader.data = 0;
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    frag3d.prototype.genTexture = function texture(channel, level, format, width, height, border, type, data) {
        let gl = this.gl;
        gl.activeTexture([
            gl.TEXTURE0,
            gl.TEXTURE1,
            gl.TEXTURE2,
            gl.TEXTURE3,
            gl.TEXTURE4,
            gl.TEXTURE5,
            gl.TEXTURE6,
            gl.TEXTURE7
        ][channel]);
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, level, format, width, height, border, format, type, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
}





$('#renderer').attr('width', window.innerWidth*window.devicePixelRatio);
$('#renderer').attr('height', window.innerHeight*window.devicePixelRatio);
$('#renderer').width(window.innerWidth);
$('#renderer').height(window.innerHeight);

$(window).resize(() => {
    $('#renderer').attr('width', window.innerWidth*window.devicePixelRatio);
    $('#renderer').attr('height', window.innerHeight*window.devicePixelRatio);
    $('#renderer').width(window.innerWidth);
    $('#renderer').height(window.innerHeight);
});
