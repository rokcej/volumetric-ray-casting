#!/usr/bin/env node

let inputDimensions = {
    width  : 0,
    height : 0,
    depth  : 0
};
let blockSize = 128;
let modalityName = 'default';
let volumeName = 'Volume';
let volumeComment = 'Volume generated with raw2bvp';
let useCompression = false;
let useGradient = false;

let timestamp = Date.now();

for (let i = 2; i < process.argv.length - 1; i++) {
    let arg = process.argv[i];
    let val = process.argv[i + 1];
    switch (arg) {
        case '-w':
        case '--width':
            inputDimensions.width = parseInt(val);
            break;

        case '-h':
        case '--height':
            inputDimensions.height = parseInt(val);
            break;

        case '-d':
        case '--depth':
            inputDimensions.depth = parseInt(val);
            break;

        case '-b':
        case '--block-size':
            blockSize = parseInt(val);
            break;

        case '-c':
        case '--compression':
            useCompression = (val === 'true');
            break;

        case '-g':
        case '--gradient':
            useGradient = (val === 'true');
            break;

        case '--modality-name':
            modalityName = val;
            break;

        case '--volume-name':
            volumeName = val;
            break;

        case '--volume-comment':
            volumeComment = val;
            break;
    }
}

// -----------------------------------------------------------------------------
// ---------------------------- MANIFEST TEMPLATES -----------------------------
// -----------------------------------------------------------------------------

const manifestTemplate = {
    meta: {
        name    : volumeName,
        comment : volumeComment,
        version : 1
    },
    modalities: [],
    blocks: []
};

const modalityTemplate = {
    name: modalityName,
    dimensions: inputDimensions,
    components: 1,
    format: 'uint8',
    transform: {
        matrix: [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]
    },
    placements: []
};

const blockTemplate = {
    url: '',
    format: 'raw',
    dimensions: {
        width  : blockSize,
        height : blockSize,
        depth  : blockSize
    }
};

const placementTemplate = {
    index: 0,
    position: {
        x: 0,
        y: 0,
        z: 0
    }
};

// -----------------------------------------------------------------------------
// ------------------------------- VOLUME UTILS --------------------------------
// -----------------------------------------------------------------------------

function totalCount(dim) {
    return dim.width * dim.height * dim.depth;
}

function index(idx, dims, offset) {
    offset = offset || {
        x: 0,
        y: 0,
        z: 0
    };
    return (idx.x + offset.x)
         + (idx.y + offset.y) * dims.width
         + (idx.z + offset.z) * dims.width * dims.height;
}

function extractBlock(volumeData, volumeDimensions, blockOffset, blockDimensions, components) {
    let blockData = Buffer.allocUnsafe(totalCount(blockDimensions) * components);
    for (let k = 0; k < blockDimensions.depth; k++) {
        for (let j = 0; j < blockDimensions.height; j++) {
            for (let i = 0; i < blockDimensions.width; i++) {
                let idx = {
                    x: i,
                    y: j,
                    z: k
                };
                let blockIndex = index(idx, blockDimensions);
                let volumeIndex = index(idx, volumeDimensions, blockOffset);
                for (let c = 0; c < components; c++) {
                    blockData[blockIndex * components + c] = volumeData[volumeIndex * components + c];
                }
            }
        }
    }
    return blockData;
}

function combineVolumeAndGradient(volumeData, gradientData) {
    if (volumeData.length * 3 !== gradientData.length) {
        throw new Error('Cannot combine volume with gradient');
    }
    let data = Buffer.allocUnsafe(volumeData.length * 4);
    for (let i = 0; i < volumeData.length; i++) {
        data[4 * i + 0] = volumeData[i];
        data[4 * i + 1] = gradientData[3 * i + 0];
        data[4 * i + 2] = gradientData[3 * i + 1];
        data[4 * i + 3] = gradientData[3 * i + 2];
    }
    return data;
}

// -----------------------------------------------------------------------------
// --------------------------------- CRC UTILS ---------------------------------
// -----------------------------------------------------------------------------

function generateCrc32Table() {
    let table = new Int32Array(256);
    for (let i = 0; i < table.length; i++) {
        let n = i;
        for (let j = 0; j < 8; j++) {
            if (n & 1) {
                n = (n >>> 1) ^ 0xedb88320;
            } else {
                n >>>= 1;
            }
        }
        table[i] = n;
    }
    return table;
}

const CRC32_TABLE = generateCrc32Table();

function crc32(data) {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return ~crc;
}

// -----------------------------------------------------------------------------
// --------------------------------- ZIP UTILS ---------------------------------
// -----------------------------------------------------------------------------

class SerialBuffer {

    static get START_SIZE() {
        return 128;
    }

    constructor(buffer) {
        this.position = 0;
        this.bigEndian = false;

        if (buffer) {
            this.buffer = buffer;
            this.size = this.buffer.length;
        } else {
            this.size = SerialBuffer.START_SIZE;
            this.buffer = Buffer.allocUnsafe(this.size);
        }
    }

    resizeIfNeeded(toAdd) {
        let newSize = this.size;
        while (this.position + toAdd > newSize) {
            newSize = newSize * 2;
        }
        if (newSize > this.size) {
            let newBuffer = Buffer.allocUnsafe(newSize);
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
            this.size = newSize;
        }
    }

    readByte() {
        let byte = this.buffer.readUInt8(this.position);
        this.position += 1;
        return byte;
    }

    readShort() {
        let short = this.bigEndian
            ? this.buffer.readUInt16BE(this.position)
            : this.buffer.readUInt16LE(this.position);
        this.position += 2;
        return short;
    }

    readInt() {
        let int = this.bigEndian
            ? this.buffer.readUInt32BE(this.position)
            : this.buffer.readUInt32LE(this.position);
        this.position += 4;
        return int;
    }

    writeByte(byte) {
        this.resizeIfNeeded(1);
        this.buffer.writeUInt8((byte >>> 0) & 0xff, this.position);
        this.position += 1;
    }

    writeShort(short) {
        this.resizeIfNeeded(2);
        if (this.bigEndian) {
            this.buffer.writeUInt16BE((short >>> 0) & 0xffff, this.position);
        } else {
            this.buffer.writeUInt16LE((short >>> 0) & 0xffff, this.position);
        }
        this.position += 2;
    }

    writeInt(int) {
        this.resizeIfNeeded(4);
        if (this.bigEndian) {
            this.buffer.writeUInt32BE(int >>> 0, this.position);
        } else {
            this.buffer.writeUInt32LE(int >>> 0, this.position);
        }
        this.position += 4;
    }

    writeBuffer(buffer) {
        this.resizeIfNeeded(buffer.length);
        buffer.copy(this.buffer, this.position);
        this.position += buffer.length;
    }

    getBuffer() {
        let slice = this.buffer.slice(0, this.position);
        return slice;
    }

}

function createLocalFileHeader(file) {
    let fileNameBuffer = Buffer.from(file.name);

    let buffer = new SerialBuffer();
    buffer.writeInt(0x04034b50);              // signature
    buffer.writeShort(20);                    // version needed to extract
    buffer.writeShort(0);                     // general purpose bit flag
    buffer.writeShort(0);                     // compression method
    buffer.writeShort(0);                     // last mod file time
    buffer.writeShort(0);                     // last mod file date
    buffer.writeInt(file.crc);                // crc32
    buffer.writeInt(file.data.length);        // compressed size
    buffer.writeInt(file.data.length);        // uncompressed size
    buffer.writeShort(fileNameBuffer.length); // file name length
    buffer.writeShort(0);                     // extra field length
    buffer.writeBuffer(fileNameBuffer);       // file name
    return buffer.getBuffer();
}

function createCentralDirectoryFileHeader(file) {
    let fileNameBuffer = Buffer.from(file.name);

    let buffer = new SerialBuffer();
    buffer.writeInt(0x02014b50);              // signature
    buffer.writeShort(0);                     // version made by
    buffer.writeShort(20);                    // version needed to extract
    buffer.writeShort(0);                     // general purpose bit flag
    buffer.writeShort(0);                     // compression method
    buffer.writeShort(0);                     // last mod file time
    buffer.writeShort(0);                     // last mod file date
    buffer.writeInt(file.crc);                // crc32
    buffer.writeInt(file.data.length);        // compressed size
    buffer.writeInt(file.data.length);        // uncompressed size
    buffer.writeShort(fileNameBuffer.length); // file name length
    buffer.writeShort(0);                     // extra field length
    buffer.writeShort(0);                     // file comment length
    buffer.writeShort(0);                     // disk number start
    buffer.writeShort(0);                     // internal file attributes
    buffer.writeInt(0);                       // external file attributes
    buffer.writeInt(file.offset);             // relative offset of local header
    buffer.writeBuffer(fileNameBuffer);       // file name
    return buffer.getBuffer();
}

function createEndOfCentralDirectoryRecord(numOfFiles, sizeOfCD, offsetOfCD) {
    let buffer = new SerialBuffer();
    buffer.writeInt(0x06054b50);              // signature
    buffer.writeShort(0);                     // number of this disk
    buffer.writeShort(0);                     // number of disk with start of CD
    buffer.writeShort(numOfFiles);            // number of CD entries on this disk
    buffer.writeShort(numOfFiles);            // total number of CD entries
    buffer.writeInt(sizeOfCD);                // size of CD without EOCD
    buffer.writeInt(offsetOfCD);              // offset of CD w.r.t. first disk
    buffer.writeShort(0);                     // zip file comment length
    return buffer.getBuffer();
}

function linearize(files, prefix = '') {
    let processed = [];
    files.forEach((file) => {
        let rawName = file.name;
        file.name = prefix + file.name;
        processed.push(file);
        if (file.type === 'directory') {
            file.data = Buffer.alloc(0);
            file.name += '/';
            processed = processed.concat(linearize(file.files, file.name));
        }
    });
    return processed;
}

function createZip(files, stream) {
    files = linearize(files);

    let offset = 0;
    files.forEach((file) => {
        console.error('Compressing ' + file.name);
        file.crc = crc32(file.data);
        file.offset = offset;
        let localFileHeader = createLocalFileHeader(file);
        stream.write(localFileHeader);
        stream.write(file.data);
        offset += localFileHeader.length + file.data.length;
    });

    let cdStart = offset;

    files.forEach((file) => {
        console.error('Writing CD header for ' + file.name);
        let cdFileHeader = createCentralDirectoryFileHeader(file);
        stream.write(cdFileHeader);
        offset += cdFileHeader.length;
    });

    let cdEnd = offset;
    let cdSize = cdEnd - cdStart;

    console.error('Writing EOCD');
    stream.write(createEndOfCentralDirectoryRecord(files.length, cdSize, cdStart));
}

// -----------------------------------------------------------------------------
// ----------------------------------- MAIN ------------------------------------
// -----------------------------------------------------------------------------

async function readInputData() {
    return new Promise((resolve, reject) => {
        let data = Buffer.allocUnsafe(totalCount(inputDimensions));

        let offset = 0;
        process.stdin.on('data', (chunk) => {
            if (offset + chunk.length > data.length) {
                reject('Too much data for this volume size!');
            } else {
                chunk.copy(data, offset);
                offset += chunk.length;
            }
        });

        process.stdin.on('end', () => {
            if (offset !== data.length) {
                reject('Not enough data for this volume size!');
            } else {
                resolve(data);
            }
        });
    });
}

function computeGradientSobel(volumeData, volumeDimensions, idx) {
    let kernelX = [
         1,  0, -1,
         2,  0, -2,
         1,  0, -1,

         2,  0, -2,
         4,  0, -4,
         2,  0, -2,

         1,  0, -1,
         2,  0, -2,
         1,  0, -1
    ];
    let kernelY = [
         1,  2,  1,
         0,  0,  0,
        -1, -2, -1,

         2,  4,  2,
         0,  0,  0,
        -2, -4, -2,

         1,  2,  1,
         0,  0,  0,
        -1, -2, -1
    ];
    let kernelZ = [
         1,  2,  1,
         2,  4,  2,
         1,  2,  1,

         0,  0,  0,
         0,  0,  0,
         0,  0,  0,

        -1, -2, -1,
        -2, -4, -2,
        -1, -2, -2
    ];
    let values = [
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,

        0, 0, 0,
        0, 0, 0,
        0, 0, 0,

        0, 0, 0,
        0, 0, 0,
        0, 0, 0
    ];
    for (let k = 0; k < 3; k++) {
        for (let j = 0; j < 3; j++) {
            for (let i = 0; i < 3; i++) {
                let kernelIdx = index({
                    x : i,
                    y : j,
                    z : k
                }, {
                    width  : 3,
                    height : 3,
                    depth  : 3
                });
                let volumeIndex = index({
                    x : idx.x + i - 1,
                    y : idx.y + j - 1,
                    z : idx.z + k - 1
                }, volumeDimensions);
                values[kernelIdx] = volumeData[volumeIndex] / 255;
            }
        }
    }

    let dx = 0;
    for (let i = 0; i < kernelX.length; i++) {
        dx += kernelX[i] * values[i];
    }
    dx /= kernelX.length;

    let dy = 0;
    for (let i = 0; i < kernelY.length; i++) {
        dy += kernelY[i] * values[i];
    }
    dy /= kernelY.length;

    let dz = 0;
    for (let i = 0; i < kernelZ.length; i++) {
        dz += kernelZ[i] * values[i];
    }
    dz /= kernelZ.length;

    //let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return [dx, dy, dz];
}

function computeGradientForward(volumeData, volumeDimensions, idx) {
    let valueCenter = volumeData[index(idx, volumeDimensions)] / 255;
    let valueX = volumeData[index({
        x : idx.x + 1,
        y : idx.y,
        z : idx.z
    }, volumeDimensions)] / 255;
    let valueY = volumeData[index({
        x : idx.x,
        y : idx.y + 1,
        z : idx.z
    }, volumeDimensions)] / 255;
    let valueZ = volumeData[index({
        x : idx.x,
        y : idx.y,
        z : idx.z + 1
    }, volumeDimensions)] / 255;

    let dx = valueX - valueCenter;
    let dy = valueY - valueCenter;
    let dz = valueZ - valueCenter;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

(async () => {
    try {
        let blockFiles = [];
        let manifest = Object.assign({}, manifestTemplate);
        let modality = Object.assign({}, modalityTemplate);
        manifest.modalities.push(modality);

        let volumeData = await readInputData();
        let numberOfBlocks = {
            width  : Math.ceil(inputDimensions.width  / blockSize),
            height : Math.ceil(inputDimensions.height / blockSize),
            depth  : Math.ceil(inputDimensions.depth  / blockSize)
        };

        let gradientData;
        if (useGradient) {
            console.error('Computing gradient');
            modality.components = 4;
            gradientData = Buffer.allocUnsafe(totalCount(inputDimensions) * 3);
            for (let k = 0; k < inputDimensions.depth; k++) {
                for (let j = 0; j < inputDimensions.height; j++) {
                    for (let i = 0; i < inputDimensions.width; i++) {
                        let centerIdx = index({
                            x: i,
                            y: j,
                            z: k
                        }, inputDimensions);
                        if (i === 0 || j === 0 || k === 0 ||
                            i === inputDimensions.width  - 1 ||
                            j === inputDimensions.height - 1 ||
                            k === inputDimensions.depth  - 1) {
                            gradientData[3 * centerIdx + 0] = 0;
                            gradientData[3 * centerIdx + 1] = 0;
                            gradientData[3 * centerIdx + 2] = 0;
                        } else {
                            let gradient = computeGradientSobel(volumeData, inputDimensions, {
                                x: i,
                                y: j,
                                z: k
                            });
                            // here, dividing by Math.sqrt(3) would prevent clamping in the worst case
                            for (let l = 0; l < 3; ++l) {
                                gradient[l] = Math.round((gradient[l] + 1.0) * 0.5 * 255);
                                gradient[l] = Math.min(Math.max(gradient[l], 0), 255);
                                gradientData[3 * centerIdx + l] = gradient[l];
                            }
                        }
                    }
                }
            }
        }

        let totalBlocks = totalCount(numberOfBlocks);

        if (useGradient) {
            volumeData = combineVolumeAndGradient(volumeData, gradientData);
        }

        for (let k = 0; k < numberOfBlocks.depth; k++) {
            for (let j = 0; j < numberOfBlocks.height; j++) {
                for (let i = 0; i < numberOfBlocks.width; i++) {
                    let idx = {
                        x: i,
                        y: j,
                        z: k
                    };
                    let blockOffset = {
                        x: idx.x * blockSize,
                        y: idx.y * blockSize,
                        z: idx.z * blockSize
                    };
                    let blockDimensions = {
                        width  : Math.min(inputDimensions.width  - blockOffset.x, blockSize),
                        height : Math.min(inputDimensions.height - blockOffset.y, blockSize),
                        depth  : Math.min(inputDimensions.depth  - blockOffset.z, blockSize)
                    };
                    let blockIndex = index(idx, numberOfBlocks);
                    let blockName = 'block-' + blockIndex + '.raw';

                    console.error('Extracting block ' + blockIndex + ' of ' + totalBlocks);
                    let blockData = extractBlock(
                        volumeData, inputDimensions,
                        blockOffset, blockDimensions,
                        modality.components);

                    let block = Object.assign({}, blockTemplate);
                    block.url = 'blocks/' + blockName;
                    block.dimensions = blockDimensions;
                    manifest.blocks.push(block);

                    let placement = Object.assign({}, placementTemplate);
                    placement.index = blockIndex;
                    placement.position = blockOffset;
                    modality.placements.push(placement);

                    blockFiles.push({
                        type: 'file',
                        name: blockName,
                        data: blockData
                    });
                }
            }
        }

        let files = [
            {
                type: 'file',
                name: 'manifest.json',
                data: Buffer.from(JSON.stringify(manifest))
            },
            {
                type: 'directory',
                name: 'blocks',
                files: blockFiles
            }
        ];

        createZip(files, process.stdout);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
