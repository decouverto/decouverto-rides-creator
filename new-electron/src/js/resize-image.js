
var input = document.getElementById('file');
        var noChange = document.getElementById('no-change');
        var resizedImage = document.getElementById('resized-image');
        var downloadImage = document.getElementById('download-resized-image');
        var originalImage = document.getElementById('original-image');
        var data = null;
        input.onclick = function () {
            this.value = null;
        };

        input.onchange = function () {
            noChange.style.display = 'none';
            resizeImageToSpecificLength(1000);
        };

        function resizeImageToSpecificLength(Ŀ) {
            if (input.files && input.files[0]) {
                var reader = new FileReader();
                reader.onload = function (event) {
                    var img = new Image();
                    img.onload = function () {
                        if (img.width > img.height) {
                            if (img.width > Ŀ) {
                                var oc = document.createElement('canvas'), octx = oc.getContext('2d');
                                oc.width = img.width;
                                oc.height = img.height;
                                octx.drawImage(img, 0, 0);
                                while (oc.width * 0.5 > Ŀ) {
                                    oc.width *= 0.5;
                                    oc.height *= 0.5;
                                    octx.drawImage(oc, 0, 0, oc.width, oc.height);
                                }
                                oc.width = Ŀ;
                                oc.height = oc.width * img.height / img.width;
                                octx.drawImage(img, 0, 0, oc.width, oc.height);
                                resizedImage.style.display = 'block';
                                data = oc.toDataURL('image/jpeg');
                                resizedImage.src = data;
                                downloadImage.href = data.replace('image/jpeg', 'image/octet-stream');
                                downloadImage.download = Math.floor(Date.now() / 1000) + '-resized.jpg';
                                downloadImage.style.display = 'block';
                            } else {
                                noChange.style.display = 'block';
                                resizedImage.style.display = 'none';
                                downloadImage.style.display = 'none';
                            }
                        } else {
                            if (img.height > Ŀ) {
                                var oc = document.createElement('canvas'), octx = oc.getContext('2d');
                                oc.width = img.width;
                                oc.height = img.height;
                                octx.drawImage(img, 0, 0);
                                while (oc.height * 0.5 > Ŀ) {
                                    oc.width *= 0.5;
                                    oc.height *= 0.5;
                                    octx.drawImage(oc, 0, 0, oc.width, oc.height);
                                }
                                oc.height = Ŀ;
                                oc.width = oc.height * img.width / img.height;
                                octx.drawImage(img, 0, 0, oc.width, oc.height);
                                resizedImage.style.display = 'block';
                                data = oc.toDataURL('image/jpeg');
                                resizedImage.src = data;
                                downloadImage.href = data.replace('image/jpeg', 'image/octet-stream');
                                downloadImage.download = Math.floor(Date.now() / 1000) + '-resized.jpg';
                                downloadImage.style.display = 'block';
                            } else {
                                noChange.style.display = 'block';
                                resizedImage.style.display = 'none';
                                downloadImage.style.display = 'none';
                            }
                        }
                    };
                    originalImage.src = event.target.result;
                    img.src = event.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }