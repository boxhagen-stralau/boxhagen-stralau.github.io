const btnDeleteDatabase = document.querySelector('#deleteDatabase');
btnDeleteDatabase.addEventListener('click', deleteDatabase);

const btnDeleteImages = document.querySelector('#deleteImages');
btnDeleteImages.addEventListener('click', deleteImages);

function deleteDatabase() {
  let deleteRequest = indexedDB.deleteDatabase("ptzdb");
  console.log("delete database ptzdb");
}

let openRequest = indexedDB.open("ptzdb", 1);
console.log("openRequest indexedDB");

openRequest.onupgradeneeded = function(event) {
  console.log("create database indexedDB");
  // triggers if the client had no database
  // ...perform initialization...
  let db = openRequest.result;
  if (!db.objectStoreNames.contains('settings')) { // if there's no "settings" store
    db.createObjectStore('settings', {keyPath: 'id'} ); // create it
    console.log("create store settings");
  }
  if (!db.objectStoreNames.contains('presets')) { // if there's no "preset" store
    db.createObjectStore('presets', {keyPath: 'id'} ); // create it
    console.log("create store presets");
  }
  if (!db.objectStoreNames.contains('images')) { // if there's no "images" store
    db.createObjectStore('images', {keyPath: 'id'} ); // create it
    console.log("create store images");
  }
};

openRequest.onerror = function(event) {
  console.error("Error", openRequest.error);
};

openRequest.onsuccess = function(event) {
  let db = openRequest.result;
  // continue working with database using db object
  console.log("success openRequest");

  let transaction = db.transaction("images", "readwrite");
  let images = transaction.objectStore("images").getAll();

  images.onsuccess = function() {
    if (this.result !== undefined) {
      for (const imgFile of this.result) {
        let id = imgFile.id.substring(config["ptz_owner_id"].length + 1);
        if (!id) {
          continue;
        }
        let node = document.querySelector("#"+ imgFile.id);
        if (node) {
          console.log(imgFile.id, node.id);
          showImage(imgFile, node);
        } else {
          console.log("node not found", "#"+ imgFile.id);
        }
      }
      console.log("preset images count = ", this.result.length); // array
    } else {
      console.log("No such preset");
    }
  };
  
  let presetdb = db.transaction("presets", "readwrite");
  let presets = presetdb.objectStore("presets").getAll();
  presets.onsuccess = function() {
    if (this.result) {
      loadPresetName(this.result);
    }
  }
  
  let settingsdb = db.transaction("settings", "readwrite");
  let settings = settingsdb.objectStore("settings").getAll();
  settings.onsuccess = function() {
    if (this.result) {
      loadSettings(this.result);
    }
  }
};

function getSnapshot(node, ip) {
  console.log("getSnapshot", node.id);
  let xhr = new XMLHttpRequest();
  
  xhr.open("GET", "http://"+ ip +"/snapshot.jpg", true);
  xhr.responseType = "blob";
  xhr.onload = function() {
    console.log(node.id);
    loadImage(xhr.response, xhr.status, node);
  }

  xhr.send();
}

function loadImage(blob, status, node) {
  console.log(status);
  if (status === 200) {
    console.log("loadImage success", node.id);
    
    // let blob = this.response;
    console.log("blob size", blob.size, blob.type);
    
    storeImage(blob, node);
  }
}

function storeImage(blob, node) {
  console.log("storeImage in database", node.id);

  let db = openRequest.result;
  let transaction = db.transaction("images", "readwrite");
  let images = transaction.objectStore("images");

  let image = { id: node.id, img: blob };
  let request = images.put(image);

  request.onsuccess = function() {
    console.log("image added to the store", request.result);

    let getImg = transaction.objectStore("images").get(request.result);

    getImg.onsuccess = function(event) {
      console.log("getImg.onsuccess", event.target.result.id);
      let imgFile = event.target.result;
      showImage(imgFile, node);
    }
    getImg.onerror = function() {
      console.log("getImg.onerror", request.result);
    }
  };

  request.onerror = function() {
    console.log("Error", request.error);
  };
}

function showImage(imgFile, node) {
  
  console.log("showImage", imgFile.id, node.id, imgFile.img.size);

  // let URL = window.URL || window.webkitURL;
  // let imgURL = URL.createObjectURL(imgFile.img);
  let file = new FileReader();
  file.readAsBinaryString(imgFile.img);
  file.onload = function (e) {
    let data = btoa(e.target.result);
    console.log("image base64 size", imgFile.img.size);
    node.firstElementChild.firstElementChild.setAttribute("src", "data:image/jpeg;base64,"+ data);
  }
  
  // console.log(imgURL);
  // node.firstElementChild.firstElementChild.setAttribute("src", imgURL);
  //
  // URL.revokeObjectURL(imgURL);
}

function deleteImages(event) {
  console.log("deleteImages");
  
  let db = openRequest.result;
  let transaction = db.transaction("images", "readwrite");
  let store = transaction.objectStore("images");
  let images = transaction.objectStore("images").getAll();

  images.onsuccess = function() {
    if (this.result !== undefined) {
      for (const imgFile of this.result) {
        let id = imgFile.id.substring(config["ptz_owner_id"].length + 1);
        if (!id) {
          continue;
        }
        let node = document.querySelector("#"+ imgFile.id);
        if (node) {
          console.log("delete image", imgFile.id, node.id, id);
          store.delete(imgFile.id);
        } else {
          console.log("node not found", "#"+ imgFile.id, id);
        }
      }
      console.log("preset images count = ", this.result.length); // array
    } else {
      console.log("No images");
    }
  };
}

function storePresetName(value, node) {
  let id = config.ptz_owner_id + "-"+ node.id;
  console.log("storePresetName", value, node.id, id);
  let db = openRequest.result;
  let transaction = db.transaction("presets", "readwrite");
  let presets = transaction.objectStore("presets");

  let preset = { id: id, value: value };
  let request = presets.put(preset);
  
  request.onerror = function() {
    console.log("Error", request.error);
  };
}

function loadPresetName(presetValues) {
  for (const preset of presetValues) {
    console.log(preset.id, preset.value);
    if (preset.id == "") {
      continue;
    }
    if (!preset.id.startsWith(config.ptz_owner_id +"-")) {
      continue;
    }
    let id = preset.id.substring(config.ptz_owner_id.length + 1);
    let node = document.querySelector("#"+ id + "> input");
    if (node) {
      console.log(preset.id, node.value, preset.value, id);
      node.value = preset.value;
    } else {
      console.log("node not found", "#"+ id);
    }
  }
  console.log("preset presets count = ", presetValues.length); // array
}

function storeSetting(node, value) {
  let id = config.ptz_owner_id + "-"+ node;
  console.log("storeSetting", node, id, value);
  let db = openRequest.result;
  let transaction = db.transaction("settings", "readwrite");
  let settings = transaction.objectStore("settings");

  let setting = { id: id, value: value };
  let request = settings.put(setting);
  
  request.onerror = function() {
    console.log("Error", request.error);
  };
}

function storePresetStart(id, value) {
  let output = document.querySelector("."+ id);
  output.textContent = value +" - "+ (parseInt(value) + 8);
  storeSetting(id,value);
}

function loadSettings(settings) {
  for (const setting of settings) {
    console.log(setting.id, setting.value);
    if (setting.id == "") {
      continue;
    }
    if (!setting.id.startsWith(config.ptz_owner_id +"-")) {
      continue;
    }
    let id = setting.id.substring(config.ptz_owner_id.length + 1);
    config[id] = setting.value;
    let node = document.querySelector("#"+ id );
    if (node) {
      console.log("loadSettings", setting.id, id, node.value, setting.value);
      node.value = setting.value;
      if (id.startsWith("cam_preset")) {
        let output = document.querySelector("."+ id);
        output.textContent = setting.value +" - "+ (parseInt(setting.value) + 8);
        config[id] = parseInt(setting.value);
      }
    } else {
      console.log("node not found", "#"+ setting.id);
    }
  }
  console.log("settings count = ", settings.length); // array
  setConfigPreset();
}

function setConfigPreset() {
  const preset = document.querySelectorAll('figure'); // preset_0..26
  camoffset = [ config.cam_preset_0, config.cam_preset_1, config.cam_preset_2 ];
  camip = [ config.cam_ip_0, config.cam_ip_1, config.cam_ip_2 ]
  let j = 0;
  let k = 0;
  for (let i = 0; i < preset.length; i++) {
    let id = preset[i].parentNode.id;
    config[id] = {cam: camip[k] , preset: camoffset[k] + j};
    j++;
    if (j == 9) {
      j = 0;
      k++;
    }
  }
  let ptz_owner_id = config["ptz_owner_id"]; // PTZ_1
  let output = document.querySelector("h1");
  output.textContent = "PTZOptics - "+ config[ptz_owner_id]; // PTZ_1 name
  document.querySelector("#ptz_owner").value = config[ptz_owner_id];
  console.log(ptz_owner_id, config[ptz_owner_id],config["ptz_owner"]);
  console.log("setConfigPreset finished");
}
