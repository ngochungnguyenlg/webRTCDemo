function getId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    videoId = (match && match[2].length === 11)
      ? match[2]
      : null;
    let embedURL= null;
    if (videoId){
        embedURL=  '<iframe class="video-player" id="show-video" src="https://www.youtube.com/embed/' +
        videoId +'" referrerpolicy="no-referrer-when-downgrade" autoplay playsinline controls allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; displaycapture"></iframe>';
        console.log(embedURL);
    }
    return embedURL;
}
// document.querySelector('#local-video').addEventListener('click',getId)

function onVideoSrcChange(src) {
    console.log('Value changed:', src);
    url = getId(src)
    if (url){
        const DisplayEl = document.querySelector('#videoSrc');
        while (DisplayEl.firstChild) {
            DisplayEl.removeChild(DisplayEl.firstChild);
        }
        DisplayEl.insertAdjacentHTML('beforeend', url);
    }
}

document.querySelector('#video-src').addEventListener('click',onVideoSrcChange)

