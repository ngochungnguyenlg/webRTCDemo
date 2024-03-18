const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
const WebSocket = require('ws');
const cors = require('cors');

app.use(express.static(__dirname));
app.use(cors());
// const key = fs.readFileSync('cert.key');
// const cert = fs.readFileSync('cert.crt');
//do these step to install pem file
//brew update
// brew install openssl
// echo 'export PATH="/usr/local/opt/openssl/bin:$PATH"' >> ~/.bash_profile
// source ~/.bash_profile
//openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
const key =  fs.readFileSync('key.pem');  
const cert = fs.readFileSync('cert.pem'); 


const httpServer = http.createServer({key, cert},app);
  
const wss = new WebSocket.Server({ server: httpServer });

console.log("server listening on port 8282")
httpServer.listen(8282);

const offers = [];
const connectedSockets = [];
const clientID = [];

let userName = password = null
wss.on('connection', (ws) => {
    console.log("a new connection to server is set up")

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.username){
            userName = data.username
            password = data.password
            if (password=='x' && !connectedSockets.includes({
                socketId: ws._socket.remoteAddress + ':' + ws._socket.remotePort,
                userName
            })){
                connectedSockets.push({
                    socketId: ws._socket.remoteAddress + ':' + ws._socket.remotePort,
                    userName
                });
                clientID.push(ws._socket.remoteAddress)
                
                if (offers.length) {
                    content_avaiOffer = JSON.stringify({ type: 'availableOffers', data: offers }) 
                    ws.send(content_avaiOffer);
                }
                console.log("finish connection and setup user data", connectedSockets)
            }

        }
        if (!clientID.includes(ws._socket.remoteAddress)){
            console.log('The unknown client, exit!!!')
            throw ('The unknown client, exit');
        }


        switch (data.type) {
            case 'getSharedList':
                //this event handle to send all current connected clients to host
                listAvi= []
                connectedSockets.forEach(
                    conDvi =>{
                        if (conDvi.userName!==data.data.userName && !listAvi.includes(conDvi)){
                            listAvi.push(conDvi)       
                        }
                    }
                )
                if (listAvi.length != 0){
                    console.log("There are available devices to share", listAvi.length)
                    ws.send(JSON.stringify({ type: 'aviSharedDevice', data: listAvi}));
                }
                break
            case 'newOffer':
                const {userName, receiverList, offer} = data.data
                console.log("Server already received new offers")
                offers.push({
                    offererUserName: userName,
                    offer: offer,
                    offerIceCandidates: [],
                    answererUserName: null,
                    answer: null,
                    answererIceCandidates: []
                });
                wss.clients.forEach(client => {

                    if (receiverList.includes(client._socket.remoteAddress + ':' + client._socket.remotePort)){
                        client.send(JSON.stringify({ type: 'newOfferAwaiting', data: offers.slice(-1) }));
                        console.log("a new offer already send to offers", client._socket.remoteAddress + ':' + client._socket.remotePort)
                    }
                });
                break;

            case 'newAnswer':
                console.log("Server already received a new answer",data, data.data.userName, data.data.offerObj,'----\n', offers)
                const offerObj = data.data.offerObj;
                const socketToAnswer = connectedSockets.find(s => s.userName === offerObj.offererUserName);

                if (!socketToAnswer) {
                    console.log("No matching socket");
                    return;
                }

                const socketIdToAnswer = socketToAnswer.socketId;
                const offerToUpdate = offers.find(o => o.offererUserName === offerObj.offererUserName);
                console.log('offerToUpdate',offerToUpdate)
                if (!offerToUpdate) {
                    console.log("No OfferToUpdate");
                    return;
                }
                //after all server will send an ack event to confirm that the peerconnection was done.
                ws.send(JSON.stringify({ type: 'ack', data: offerToUpdate.offerIceCandidates }));

                offerToUpdate.answer = offerObj.answer;
                offerToUpdate.answererUserName = data.data.userName;
                
                //send back the answer to offerer
                wss.clients.forEach(client => {
                    if (client._socket.remoteAddress + ':' + client._socket.remotePort === socketIdToAnswer && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'answerResponse', data: offerToUpdate }));
                        console.log('finish send to offerer')
                    }
                });

                break;

            case 'sendIceCandidateToSignalingServer':
                
                console.log('server received sendIceCandidateToSignalingServer ', data.data.iceUserName)
                const {iceCandidate,iceUserName,didIOffer } = data.data;                
                if (didIOffer) {
                    const offerInOffers = offers.find(o => o.offererUserName === iceUserName);
                    if (offerInOffers) {
                        offerInOffers.offerIceCandidates.push(iceCandidate);
                        if (offerInOffers.answererUserName) {
                            console.log("pass offerInOffers.answererUserName")
                            wss.clients.forEach(client => {
                                if (client!==ws && client.readyState === WebSocket.OPEN) {
                                    console.log("pass client.readyState === WebSocket.OPEN")
                                    client.send(JSON.stringify({ type: 'receivedIceCandidateFromServer', data: iceCandidate}));
                                }
                            });
                        }
                    }
                } else {
                    //this can happen when clients try to anwser to host
                    const offerInOffers = offers.find(o => o.answererUserName === iceUserName);
                    if (offerInOffers) {
                        wss.clients.forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'receivedIceCandidateFromServer', data: iceCandidate }));
                                offers.pop()
                            }
                        });
                    }
                }
                break;

            default:
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected',ws._socket.remoteAddress);
        let removed = false

        disconnected = null
        iDdisconnected = null
        connectedSockets.forEach(cnt =>{
            socketId= ws._socket.remoteAddress + ':' + ws._socket.remotePort
            if (cnt.socketId == socketId){
                disconnected = cnt
                iDdisconnected = ws._socket.remoteAddress
            }
        })
        if (disconnected){
            idx=connectedSockets.indexOf(disconnected)
            
            if (idx >-1){
                connectedSockets.splice(idx,1)
                console.log('disconnected ', disconnected, idx)
            }
            idxID=clientID.indexOf(iDdisconnected)
            if (idx >-1){
                clientID.splice(idxID,1)
                console.log('iDdisconnected ', iDdisconnected, idxID)

            }
            removed=true
        }
        console.log('connectedSockets = ',connectedSockets)
        if (!removed){
            throw ("cannot delete the disconnected device")
        }
    });
});
