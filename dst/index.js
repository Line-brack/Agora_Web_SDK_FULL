// create Agora client
var client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

var localTracks = {
  videoTrack: null,
  audioTrack: null
};
var remoteUsers = {};
// Agora client options
var options = {
  appid: null,
  channel: null,
  uid: null,
  token: null
};

async function getToken(uid,roomid) {
  const response = await fetch("/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({"uid":uid ,"roomid":roomid}) // リクエストボディに roomID を含める
  });

  const data = await response.json();
  return {"appid":data.appid,"token":data.token}; // サーバーからのレスポンスのトークンを返す
}

// the demo can auto join channel with params in url
$(() => {
  var urlParams = new URL(location.href).searchParams;
  //options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  //options.token = urlParams.get("token");

  console.log("request token")

})


$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    const channel = $("#channel").val();
    const uid=options.uid;
    console.log("request token")
    options.channel=channel;
    const {token,appid}=await getToken(uid,channel);
    console.log("success get token")
    
    
    options.token=token;
    options.appid=appid;

    await join();

    socket.emit("updateRoom",{"uid":options.uid,"flag":"join"})
  
    if(options.token) {
      $("#success-alert-with-token").css("display", "block");
    } else {
      $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
      $("#success-alert").css("display", "block");
    }
  } catch (error) {
    console.error(error);
  } finally {
    $("#leave").attr("disabled", false);
  }
})

$("#leave").click(function (e) {
  leave();
})

async function join() {
  try {
  // add event listener to play remote tracks when remote user publishs.
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);
  console.log("joining...",options)
  // join a channel and create local tracks, we can use Promise.all to run them concurrently
  const [result, audioTrack, videoTrack ] = await Promise.all([
    // join the channel
    client.join(options.appid, options.channel, options.token ,options.uid),
    // create local tracks, using microphone and camera
    AgoraRTC.createMicrophoneAudioTrack(),
    AgoraRTC.createCameraVideoTrack()
  ]);
  localTracks.audioTrack=audioTrack;
  localTracks.videoTrack=videoTrack;
  // play local video track
  localTracks.videoTrack.play("local-player");
  $("#local-player-name").text(`localVideo(${options.uid})`);

  // publish local tracks to channel
  await client.publish(Object.values(localTracks));
  console.log("publish success");
}catch(error){
  console.error(error)
}
}
async function leave() {
  console.log("options",options)
  socket.emit("leave",{"room":options.channel,"uid":options.uid})
  options.channel=null
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if(track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("client leaves channel success");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");
  if (mediaType === 'video') {
    const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})</p>
        <div id="player-${uid}" class="player"></div>
      </div>
    `);
    $("#remote-playerlist").append(player);
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

function handleUserUnpublished(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

