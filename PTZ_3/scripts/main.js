let config = {
  cam_ip_0: "192.168.1.73",
  cam_ip_1: "192.168.1.73",
  cam_ip_2: "192.168.1.73",
  cam_ip_3: "192.168.1.73",
  cam_preset_0: 10,
  cam_preset_1: 10,
  cam_preset_2: 10,
  cam_preset_3: 10,
};

console.log(document.currentScript.baseURI)

config["ptz_owner_id"] = document.currentScript.baseURI.split('/').reverse()[1];
config["ptz_owner"] = config["ptz_owner_id"]; // setting default value PTZ_1
config[ config["ptz_owner_id"] ] = config["ptz_owner"];

const images = document.querySelectorAll('.wrapper');
for (let myImage of images) {
  myImage.addEventListener('click', selectPreset);
}

const clickButton = document.querySelector('nav');
clickButton.addEventListener('click', selectCam);

const button = document.querySelectorAll('button');

for (let i = 0; i < 5; i++) {
  button[i].id = "cam_"+ i;
}
button[0].classList.add('active_button');

const preset = document.querySelectorAll('figure');
for (let i = 0; i < preset.length; i++) {
  preset[i].parentNode.id = config["ptz_owner_id"] +"-preset_"+ i;
}

const article = document.querySelectorAll('article');
for (let i = 0; i < article.length; i++) {
  article[i].classList.add("cam_"+ i);
}

const divs = document.getElementsByTagName('input');
for (const div of divs) {
  div.addEventListener('click', e => {
    e.stopPropagation();
  });
  
  if (div.parentNode.id && div.parentNode.id.startsWith(config["ptz_owner_id"] +"-preset") ) {
    div.addEventListener('input', updateValue);
  }
  
  if (div.id && div.id.startsWith("cam_preset") ) {
    div.addEventListener('input', updatePreset);
  }
  
  if (div.id && div.id.startsWith("cam_ip") ) {
    div.addEventListener('input', updateCamIp);
  }
  
  if (div.id && div.id.startsWith("ptz_owner") ) {
    div.addEventListener('input', updateOwner);
  }
}

function updateValue(event) {
  console.log(this.value, this.parentNode.id);
  storePresetName(this.value, this.parentNode);
}

function updatePreset(event) {
  console.log(this.value, this.id);
  config[this.id] = parseInt(this.value);
  storePresetStart(this.id, this.value);
  setConfigPreset();
}

function updateCamIp(event) {
  console.log(this.value, this.id);
  config[this.id] = this.value;
  storeSetting(this.id, this.value);
}

function updateOwner(event) {
  console.log(this.value, this.id);
  let output = document.querySelector("h1");
  output.textContent = "PTZOptics - "+ this.value;
  let ptz_owner_id = config["ptz_owner_id"];  // PTZ_1
  config[ptz_owner_id] = this.value;
  storeSetting(ptz_owner_id, this.value);
  console.log(this.value, this.id, ptz_owner_id, config[ptz_owner_id]);
}

function selectPreset(event) {
  let node = event.target;
  
  if (node.nodeName != "DIV") {
    node = node.parentNode;
    if (node.nodeName != "DIV") {
      node = node.parentNode;
    }
  }
  console.log("add active", node.id);
  
  let active = document.querySelector('.active_cam > .wrapper > .active');
  console.log(" remove active");
  if ( active ) {
    active.classList.remove('active');
  }
  
  node.classList.add('active');
  
  let setPreset = document.querySelector('input[name="set_presets"]');
  console.log(setPreset.checked);
  
  let ip = config[node.id]["cam"];
  let positionnum = config[node.id]["preset"];
  let url = "http://" + ip + "/cgi-bin";
  let action;
  
  if (setPreset.checked) {
    url = url + "/ptzctrl.cgi?ptzcmd&" + "posset" + "&" + positionnum + "";
    action = "posset";
    getSnapshot(node, ip);
  } else {
    url = url + "/ptzctrl.cgi?ptzcmd&" + "poscall" + "&" + positionnum + "";
    action = "poscall";
  }
  
  setPreset.checked = false;
  console.log(url);
  runAction(url, ip, action, positionnum);
}

function selectCam(event) {
  if (event.target.nodeName == "NAV") {
    return;
  }
  
  let active = document.querySelector('.active_cam');
  if ( active ) {
    active.classList.remove('active_cam');
  }
  
  let selected = document.querySelector("."+ event.target.id);
  selected.classList.add('active_cam');
  
  let active_button = document.querySelector('.active_button');
  if (active_button) {
    active_button.classList.remove('active_button');
  }
  
  event.target.classList.add('active_button');
}

function runAction(url, ip, action, positionnum) {
  let xhr = new XMLHttpRequest();
  
  xhr.open("GET", url);
  xhr.onload = function() {
    console.log("runAction", this.status, ip, action, positionnum);
    document.querySelector('#status_1').textContent = `${ip} - ${this.status} ${this.statusText}`;
    document.querySelector('#status_2').textContent = action;
    document.querySelector('#status_3').textContent = positionnum;
  }
  xhr.onerror = function() {
    console.log("runAction", this.status, ip, action, positionnum);
    document.querySelector('#status_1').textContent = `${ip} - ${this.status} ${this.statusText}`;
    document.querySelector('#status_2').textContent = action;
    document.querySelector('#status_3').textContent = positionnum;
  }

  xhr.send();
}
