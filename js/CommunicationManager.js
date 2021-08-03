const io = require('socket.io-client');
const {v4: uuidv4} = require('uuid');

const socket = io('ws://localhost:8000');
const tasks = {};
let counter = 0;

socket.on('connect', () => {
  console.log('Connection to server established. Socket ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.log('Connection Error:', err);
});

socket.on('return_result', (data) => {
  if (data.id in tasks) {
    console.log('Receiving data...');
    delete tasks[data.id];
    console.log('Outstanding tasks: '+Object.keys(tasks).length);
  } else {
    console.log('Data was not found! Received wrong package!');
  }
});

/**
 * TODO
 */
function sendData() {
  const timeArray = [2000, 3000, 1000, 1500];
  const id = createID();
  tasks[id] = {
    'table': 't_0',
    'fragment': 'f_0',
    'side': 'recto',
  };
  const data = {
    'id': id,
    'counter': counter,
    'request': ['segmentation'],
    'file': 'image file',
  };
  console.log('Sending Data...');
  console.log('Outstanding tasks: '+Object.keys(tasks).length);
  socket.emit('upload_data', data);
  counter = counter + 1;
  clearInterval(timer);
  timer = setInterval(sendData, randRange(timeArray));
}

/**
 * @return {String}
 */
function createID() {
  return uuidv4();
}

/**
 * TODO
 * @param {*} data
 * @return {*}
 */
function randRange(data) {
  const newTime = data[Math.floor(data.length * Math.random())];
  return newTime;
}

let timer = setInterval(sendData, 1000);
