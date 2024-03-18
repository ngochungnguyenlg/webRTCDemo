const userName = "Host-"+Math.floor(Math.random() * 100000)
const password = "x";
document.querySelector('#user-name').innerHTML = userName;

const ws = new WebSocket('ws://192.168.55.106:8282');

const localVideoEl = document.querySelector('#remote-video');
const localCurVideo = document.querySelector('#videoSrc');

let localStream; //a var to hold the local video stream
let remoteStream; //a var to hold the remote video stream
let peerConnection; //the peerConnection that the two clients use to talk
let didIOffer = false;

let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

//send password and user name
ws.onopen = function() {
    // when a socket is opend client should send the name and password to server, default password = 'x'
    ws.send(JSON.stringify({
    username: userName,
    password: password
    }));
};
//when a client initiates a call
const start = async (srcType)=>{
    //srcType: share options
    //0 share screen, 1 share current video
    await fetchUserMedia(srcType);
    //peerConnection is all set with our STUN servers sent over
    await createPeerConnection();
    //create offer time!
    try{
        //prepare list of receiver, all data in checkboxes is fixed right after users click in checkbox
        var receiverList = [];
        var checkboxes = document.querySelectorAll('.dropdown-item input[type="checkbox"]');
        checkboxes.forEach(function(checkbox) {
            if (checkbox.checked) {
                receiverList.push(checkbox.value);
            }
        });
        const offer = await peerConnection.createOffer();
        console.log(offer);
        await peerConnection.setLocalDescription(offer);
        didIOffer = true;
        
        content = JSON.stringify({type:'newOffer', data: {userName,receiverList, offer} })
        await ws.send(content); //send offer to signalingServer
        console.log("finishing")
    }catch(err){
        console.log(err)
    }

}

const answerOffer = async(offerObj)=>{
    console.log('start answerOffer')
    await fetchUserMedia(0)
    await createPeerConnection(offerObj);
    const answer = await peerConnection.createAnswer({}); //just to make the docs happy
    await peerConnection.setLocalDescription(answer); //this is CLIENT2, and CLIENT2 uses the answer as the localDesc
    console.log(offerObj)
    console.log(answer)

    offerObj.answer = answer 

    content = JSON.stringify({type:'newAnswer', data: {userName,offerObj} })
    await ws.send(content)
    
}

const updateICECandiate = async(offerIceCandidates) =>{
    console.log('updateICECandiate',offerIceCandidates )
    await offerIceCandidates.forEach(c=>{
        peerConnection.addIceCandidate(c);
        console.log("======Added Ice Candidate======")
    })
}

const addAnswer = async(offerObj)=>{
    //addAnswer is called in socketListeners when an answerResponse is emitted.
    //at this point, the offer and answer have been exchanged!
    console.log('offerObj.answer', offerObj.answer);
    console.log(peerConnection.signalingState);
    try {
        await peerConnection.setRemoteDescription(offerObj.answer);
        console.log('setRemoteDescription success');
        console.log(peerConnection.signalingState);
    } catch (error) {
        console.error('setRemoteDescription error:', error);
    }
}
    

const fetchUserMedia = (srcType)=>{
    //0 share screen, 1 share current video

    return new Promise(async(resolve, reject)=>{
        try{
            let stream = null
            if (srcType ===0){
                const displayMediaOptions = {
                    video: {
                        cursor: "always"
                    },
                    audio: {
                        autoGainControl: false,
                        channelCount: 2,
                        echoCancellation: false,
                        latency: 0,
                        noiseSuppression: false,
                        sampleRate: 48000,
                        sampleSize: 8,
                        volume: 1.0
                    },
                    preferCurrentTab: false,
                    selfBrowserSurface: "exclude",
                    systemAudio: "include",
                    surfaceSwitching: "include",
                    monitorTypeSurfaces: "include",
                  };

                try {
                    stream =await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                } catch (err) {
                    console.error(`Error: ${err}`);
                }
            }
            else if (srcType ===1){
                try{
                    if (localCurVideo.captureStream) {
                        stream = localCurVideo.captureStream();
                        console.log('Captured stream from leftVideo with captureStream',
                            stream);
                    } else if (localCurVideo.mozCaptureStream) {
                        stream = localCurVideo.mozCaptureStream();
                        console.log('Captured stream from leftVideo with mozCaptureStream()',
                            stream);
                    } 
                    else   
                    {
                        console.log('captureStream() not supported');
                    }
                    
                }
                catch (err){
                    alert("sorry current time, the shared content is not available, please reload again!", err)
                }
                
            }
           
            if (stream!==null){
                localVideoEl.srcObject = stream;
                localStream = stream;    
                resolve(); 
            }
            
        }catch(err){
            console.log(err, localCurVideo);
            reject()
        }
    })
}

const createPeerConnection = ()=>{
    return new Promise(async(resolve, reject)=>{
        //RTCPeerConnection is the thing that creates the connection
        //we can pass a config object, and that config object can contain stun servers
        //which will fetch us ICE candidates
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        // remoteStream = new MediaStream()
        // remoteVideoEl.srcObject = remoteStream;
        try{
            localStream.getTracks().forEach(track=>{
                //add localtracks so that they can be sent once the connection is established
                peerConnection.addTrack(track,localStream);
            })
        }
        catch(err){
            console.log("an error already happened ", err)
        }
        //log the state of peerConnection
        peerConnection.addEventListener("signalingstatechange", (event) => {
            console.log('signalingstatechange', event)
            console.log('peerConnection.signalingState',peerConnection.signalingState)
        });

        peerConnection.addEventListener('icecandidate',e=>{
            console.log('........Ice candidate found!......')
            if(e.candidate){
                console.log("send ICE candidate to signaling server start")
                content = JSON.stringify({type:'sendIceCandidateToSignalingServer', data: {
                    iceCandidate: e.candidate,
                    iceUserName: userName,
                    didIOffer,
                } })
                ws.send(content)
                console.log("send ICE candidate to signaling server end")    
            }
        })
        
        peerConnection.addEventListener('track',e=>{
            console.log('Received tracks', e)
            e.streams[0].getTracks().forEach(track=>{
                remoteStream.addTrack(track,remoteStream);
                console.log("finish add track into remote Stream")
            })
        })
        resolve();
    })
}

const addNewIceCandidate = iceCandidate=>{
    console.log('iceCandidate',iceCandidate)
    peerConnection.addIceCandidate(iceCandidate)
    console.log("======Added Ice Candidate======")
}



const showBtnDwn = async(showList)=>{
    //this function handle event click on shared device
    //step 1: User send a signal to server request update connected users list.
    //step 2: Keep checked box and update uncheck box list if need
    try{
        console.log(showList.constructor.name)
        var dropdownMenu = document.getElementById('btn-dwn_'); 
        var checkedItems = [];
        var checkboxes = document.querySelectorAll('.dropdown-item input[type="checkbox"]');
        checkboxes.forEach(function(checkbox) {
            if (checkbox.checked) {
                checkedItems.push(checkbox.value);
            }
        });

        console.log("showList.constructor.name", showList.constructor.name)

        if (showList.constructor.name=='PointerEvent' || showList.constructor.name=='MouseEvent'){
            console.log("Trace There are available devices to share lable shared device...")
            data_n = null
            content = JSON.stringify({type:'getSharedList', data: {userName, data_n} })
            await ws.send(content); //send request update client list to signalingServer
            console.log("finishing")
        }
        else if (checkedItems.length == 0){
            while (dropdownMenu.firstChild) {
                dropdownMenu.removeChild(dropdownMenu.firstChild);
            }
            showList.forEach(item=> {
                if (item.userName.includes("Client")){
                    var listItem = document.createElement('div');
                    listItem.classList.add('dropdown-item');
                    listItem.id = item.socketId;
                    var checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.classList.add('form-check-input');
                    checkbox.value = item.socketId;
                    var label = document.createElement('label');
                    label.classList.add('form-check-label');
                    label.textContent = item.userName;
                    listItem.appendChild(checkbox);
                    listItem.appendChild(label);
                    dropdownMenu.appendChild(listItem);
                }
            });
        }
        else{
            const checkedShowList = showList.filter(value => checkedItems.includes(value.socketId));
            //delete the old
            checkboxes.forEach(function(checkbox) {
                if (!checkbox.checked) {
                    var childElement = document.getElementById(checkbox.value); 
                    if (dropdownMenu&&childElement){
                        dropdownMenu.removeChild(childElement);
                    }
                }
                let delB = false
                if (checkedShowList.length ===0){
                    var childElement = document.getElementById(checkbox.value); 
                    if (dropdownMenu&&childElement){
                        dropdownMenu.removeChild(childElement);
                    }
                }
                else{
                    checkedShowList.forEach(remainCk =>{
                        console.log('remainCk.socketId ===checkbox.value', remainCk.socketId, checkbox.value)
                        if(remainCk.socketId ===checkbox.value){
                            delB = true
                        }
                    })
                    if (!delB){
                        var childElement = document.getElementById(checkbox.value); 
                        if (dropdownMenu&&childElement){
                            dropdownMenu.removeChild(childElement);
                        }
                    }
                }
            });
            //add new clients
            showList.forEach(item=> {
                if (!checkedShowList.includes(item) && item.userName.includes("Client")){
                var listItem = document.createElement('div');
                listItem.classList.add('dropdown-item');
                listItem.id = item.socketId;
                var checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('form-check-input');
                checkbox.value = item.socketId;
                var label = document.createElement('label');
                label.classList.add('form-check-label');
                label.textContent = item.userName;
                listItem.appendChild(checkbox);
                listItem.appendChild(label);
                dropdownMenu.appendChild(listItem);
            }
            });
        }
        
    }catch(err){
        console.log(err)
    }

}


const showSelectedSource = function() {
    const selectSource = document.querySelector('#selectSource');
    while (selectSource.firstChild) {
        selectSource.removeChild(selectSource.firstChild);
    }
    //0 share screen, 1 share current video

    const buttonContainer = document.createElement('div');

    const currentVideoBtn = document.createElement('button');
    currentVideoBtn.classList.add('btn', 'btn-secondary');
    currentVideoBtn.textContent = 'Share current video';
    currentVideoBtn.addEventListener('click', () => {
        while (selectSource.firstChild) {
            selectSource.removeChild(selectSource.firstChild);
        }
        start(1)            
    });

    const shareScreenBtn = document.createElement('button');
    shareScreenBtn.classList.add('btn', 'btn-secondary');
    shareScreenBtn.textContent = 'Share screen';
    shareScreenBtn.addEventListener('click', () => {
        while (selectSource.firstChild) {
            selectSource.removeChild(selectSource.firstChild);
        }
        start(0)

    });
    buttonContainer.appendChild(currentVideoBtn);
    buttonContainer.appendChild(shareScreenBtn);
    selectSource.appendChild(buttonContainer);
}

document.querySelector('#btn-dwn').addEventListener('click',showBtnDwn)
document.querySelector('#shareSrc').addEventListener('click',showSelectedSource)
