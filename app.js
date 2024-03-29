const express = require("express");

const {RtcTokenBuilder,RtmTokenBuilder,RtcRole,RtmRole}=require("agora-access-token");
const http=require("http");
const socketIo = require("socket.io");
const bodyParser=require("body-parser");
const { NONAME } = require("dns");
const app = express();
const server=http.createServer(app);
const io=socketIo(server);
const PORT = process.env.PORT || 3000;

// ユーザーidを管理するオブジェクト
let users = [];
let rooms={};

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

class User{
    constructor(uid,x,y,socket){
        this.uid=uid
        this.x=x
        this.y=y
        this.room=null
        this.socket=socket
    }
}

function generateUserID(){
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

io.on("connection",(socket)=>{
    const userID=generateUserID();
    users.push(new User(userID,0,0,socket));
    console.log("generated user",userID);
    socket.emit("userID",userID)

    users.forEach((user,i)=>{
        console.log(i,user.uid);
    });

    socket.on("leave",(data)=>{
        const roomid=data.room
        const uid=data.uid
        console.log("user ",uid," leave room ",roomid)
        rooms[roomid]=rooms[roomid].filter(usr=>usr.uid!=uid);//roomsから消去
        const user=users.filter(usr => usr.uid ==uid)[0];
        user.room=null;//部屋の登録を削除
    })

    // クライアントからの切断時の処理
    socket.on("disconnect", () => {
        console.log("user disconnected");
        // 切断したユーザーを削除する
        const user=users.filter(user => user.socket ==socket)[0];
        const roomid=user.room;
        if(roomid!=null){
            rooms[roomid]=rooms[roomid].filter(usr=>usr.uid!=user.uid);//roomsから消去
            console.log("deleted in rooms")
        }
        users=users.filter(user => user.socket !==socket);//usersから消去
        console.log("deleted in users")
        // users.forEach((user,i)=>{
        //     console.log(i,user.uid);
        // });
        //io.emit("userLeft", users.map(user=>user.uid));
    });

    // クライアントからの移動情報を受信
    socket.on("move", (data) => {
        //console.log("data_c",data.uid)
        //console.log("data_s",(users.filter(user=>user.uid==data.uid)[0]).uid)
        let user=users.filter(user=>user.uid==data.uid)[0];
        console.log("user",user.uid,"moved",user.x,user.y,"=>",data.x,data.y)
        user.x = data.x;
        user.y = data.y;
        const roomid=user.room;
        // 移動したユーザーの情報を全クライアントに送信
        if(roomid!=null){
            console.log("userMoved")
            io.emit("userMoved", {
                "persons":
                rooms[roomid].map(user=>({
                    "x":user.x,
                    "y":user.y,
                    "uid":user.uid
                })),
                "room":roomid,
            });
        }else{
            socket.emit("userMoved",{
            "persons":[{
                "x":user.x,
                "y":user.y,
                "uid":user.uid
            }],
            "room":null,
            })
        }
    });

    // socket.on("sendUserID",(userID)=>{
    //     console.log("client user id",userID);
    //     socket.emit("userID",userID);
    // });
});

// Expressで静的ファイルの配信を設定
app.use(express.static(__dirname + "/dst"));

// ルートへのアクセスに対する処理
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// // クライアントからの接続時の処理
// io.on("connection", (socket) => {
//     console.log("a user connected");

//     // 新しいユーザーの駒を作成し、全クライアントに送信
//     const userId = socket.id;
//     users[userId] = {
//         x: Math.random() * 500,
//         y: Math.random() * 500,
//         color: getRandomColor()
//     };
//     io.emit("userJoined", users);





//     // joinイベントを受信したときにjoin関数を呼び出す
//     socket.on("join", () => {
//         join(); // join関数を呼び出す
//     });
// });
  



// // ランダムな色を生成する関数
// function getRandomColor() {
//     const letters = "0123456789ABCDEF";
//     let color = "#";
//     for (let i = 0; i < 6; i++) {
//         color += letters[Math.floor(Math.random() * 16)];
//     }
//     return color;
// }

app.post("/token",(req,res)=>{
    console.log("token request")
    console.log(req.body);
    const {uid,roomid} = req.body;
    const appID="<Agora App ID>"
    const appCertificate="<Agora Certificate>";
    const role=RtcRole.PUBLISHER;
    const expirationTimeInSeconds=3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    console.log("uid",uid,"room",roomid)

    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds
    //トークンの生成
    const token=RtcTokenBuilder.buildTokenWithAccount(appID,appCertificate,roomid,uid,role,privilegeExpiredTs);
    console.log("generated token ",token)
    res.json({"token":token,"appid":appID});
    //トークンの取得に成功したとき
    if(token!=undefined){
        //console.log("一回だけ呼ばれてほしい")
        //console.log("token not null...")
        //登録したいユーザクラスを探す
        let user=users.filter(user => user.uid == uid)[0];
        user.room=roomid
        //console.log("hoge",user)
        //user.room=roomid;
        //ユーザをルームに登録
        if(rooms[roomid]==undefined){//ルームが未作成
            //console.log("room uncreated")
            rooms[roomid]=[]
            //console.log("hoge",rooms[roomid])
        }
        rooms[roomid].push(user);//ルームと紐づける
        console.log("success:token request")
        //console.log("fuga",user)
    }
    console.log(roomid,rooms[roomid].map(usr=>usr.uid))
});


// サーバーを起動
server.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})