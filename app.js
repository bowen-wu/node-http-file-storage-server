const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 8080;
const baseDirname = __dirname + '/test';

const server = http.createServer();

server.on('request', (req, res) => {
  if (req.method === 'GET') {
    const absolutePath = getAbsolutePath(req);
    try {
      const isFile = fs.statSync(absolutePath).isFile();
      if (isFile) {
        res.end(getFile(req, res, absolutePath));
      } else {
        res.end(getDirFileList(req, res, absolutePath) + '<br/>' + getFile(req, res, __dirname + '/index.html'));
      }
    } catch (err) {
      console.error(err);
      res.setHeader('Content-Type', 'text/plain;charset=utf-8');
      res.end('路径错误，请检查路径!');
    }
  }
  if (req.method === 'POST') {
    parseFile(req, res);
  }

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

function getAbsolutePath(req) {
  const path = url.parse(req.url).path;
  return baseDirname + path;
}

function getDirFileList(req, res, absolutePath) {
  try {
    let result = '';
    const files = fs.readdirSync(absolutePath);
    files.forEach(file => {
      result += file + '<br/>';
    });

    return result;
  } catch (err) {
    console.error(err);
    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    return '路径错误，请检查路径!';
  }
}

function getFile(req, res, absolutePath) {
  const buffer = fs.readFileSync(absolutePath);
  const filename = path.basename(absolutePath);
  if (absolutePath.endsWith('index.html')) {
    res.setHeader('Content-Type', 'text/html');
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment;filename=' + filename);
  }
  return buffer;
}

function parseFile(req, res) {
  const absolutePath = getAbsolutePath(req);
  req.setEncoding('binary');
  let body = '';
  let boundary = req.headers['content-type'].split('; ')[1].replace('boundary=', '');

  req.on('data', function (chunk) {
    body += chunk;
  });

  req.on('end', (err) => {
    if (err) {
      console.error(err);
      res.end('上传失败，请稍后重试!');
    }
    const list = body.split(boundary);
    let contentType = '';
    let fileName = '';

    for (let i = 0; i < list.length; i++) {
      if (list[i].includes('Content-Disposition')) {
        const data = list[i].split('\r\n');
        for (let j = 0; j < data.length; j++) {
          if (data[j].includes('Content-Disposition')) {
            const info = data[j].split(':')[1].split(';');
            fileName = info[info.length - 1].split('=')[1].replace(/"/g, '');
          }
          if (data[j].includes('Content-Type')) {
            contentType = data[j];
          }
        }
      }
    }

    const start = body.toString().indexOf(contentType) + contentType.length + 4;
    const startBinary = body.toString().substring(start);
    const end = startBinary.indexOf('--' + boundary + '--') - 2;
    const binary = startBinary.substring(0, end);
    const bufferData = Buffer.from(binary, 'binary');
    fs.writeFile(absolutePath + '/' + fileName, bufferData, () => {
      res.end(JSON.stringify({msg: 'success'}));
    });
  });
}
