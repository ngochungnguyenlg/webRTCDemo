

ws.onmessage = function(event) {
    // const data = JSON.parse(event.data);
    // const data = JSON.parse(event);
    console.log('from listener', event, typeof(event.data), event.data["type"])
    const data = JSON.parse(event.data);
    switch(data.type){
        case 'availableOffers':
            createOfferEls(data.data)
            break;
       case 'newOfferAwaiting':
            createOfferEls(data.data)
            break;
        case 'answerResponse':
            console.log("answerResponse with data: ",data.data)
            addAnswer(data.data)
            break;
        case 'receivedIceCandidateFromServer':
            console.log("listen to receivedIceCandidateFromServer")
            addNewIceCandidate(data.data)
            console.log(data.data)
            break
        case 'ack':
            console.log("listen to ack", data.data)
            updateICECandiate(data.data)
            break
        case 'aviSharedDevice':
            console.log("listen to aviSharedDevice")
            showBtnDwn(data.data)
            break

    }
};

function createOfferEls(offers){
    //make green answer button for this new offer

    console.log("createOfferEls is running")

    const answerEl = document.querySelector('#videoSrc');
    offers.forEach(o=>{
        console.log(o);
        const newOfferEl = document.createElement('div');
        newOfferEl.innerHTML = `<button class="btn btn-success col-1" id ="accept-btn"> Accept Display ${o.offererUserName}</button>`
        newOfferEl.addEventListener('click',()=>{
            answerOffer(o)
            newOfferEl.remove();
            console.log("already remove buttion accept display")
        })
        answerEl.appendChild(newOfferEl);
        console.log("Already click")


    })
}


