const socket=io();
class Meta2D{
    constructor(){
        this.canvas=document.getElementById("room");
        this.ctx=this.canvas.getContext("2d");
        this.initialize()
        this.addEventListeners();
        this.addSocketEvents();

    }
    initialize(){//canvasと人の配置
        const width=600;
        const height=400;
        this.initRoom(width,height)
        this.persons=[]//renderに使うユーザのリスト
    }
    initRoom(width,height){        
        this.canvas.width=width;
        this.canvas.height=height;
        
    }
    drawRoom(){
        this.ctx.fillStyle="black"
        const wid=this.canvas.width;
        const hei=this.canvas.height;
        this.ctx.fillRect(0,0,wid,hei);
    }
    drawAvatars(){
        const r=5;
        const color="blue";
        this.persons.forEach(avatar=>{
            this.ctx.beginPath();
            this.ctx.arc(avatar.x, avatar.y, r*2, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.closePath();
        })
    }
    render(){
        this.drawRoom()
        this.drawAvatars()
    }
    adjustVolume(){
        const my=this.persons.filter(user=>user.uid==options.uid)[0]
        const others=this.persons.filter(user=>user.uid!=options.uid)
        client.remoteUsers.forEach(user=>{
            const other=others.filter(usr=>usr.uid==user.uid)[0]
            const vol=this.calcVolume(my,other,100,0,200);
            user.audioTrack.setVolume(vol)
            console.log("vol",vol)
        })
    }
    calcVolume(my,other,maxVol,minVol,maxDist){
        const dist=Math.hypot(other.x-my.x,other.y-my.y);
        const weight=1-Math.min(dist,maxDist)/maxDist;//距離0で1,距離>=maxDistで0
        const vol=maxVol*weight+(1-weight)*minVol;
        return vol;


    }

    addEventListeners(){
        this.canvas.addEventListener("dblclick", (event) => {
            const rect=event.target.getBoundingClientRect();
            const x = event.x-rect.left;
            const y = event.y-rect.top;
            socket.emit("move",{"x":x,"y":y,"uid":options.uid})
        });
        document.addEventListener("keydown", (event) => {
            const keyCode = event.keyCode;
            //console.log("keydown",this.persons)
            //console.log("uid",options.uid)
            let my_avatar=this.persons.filter((person)=>person["uid"]==options.uid)[0];
            function crop(x,min,max){
                return Math.min(Math.max(min,x),max)
            }
            let x=my_avatar.x
            let y=my_avatar.y
            let dx=0;
            let dy=0;
            switch (keyCode) {
                case 37: // 左矢印キー
                    dx=-3;
                    break;
                case 38: // 上矢印キー
                    event.preventDefault();
                    dy=-3;
                    break;
                case 39: // 右矢印キー
                    dx=3;
                    break;
                case 40: // 下矢印キー
                    event.preventDefault();
                    dy=3
                    break;
            }
            x=crop(x+dx,0,this.canvas.width)
            y=crop(y+dy,0,this.canvas.height)
            socket.emit("move",{"x":x,"y":y,"uid":options.uid})
        });
    }
    addSocketEvents(){
        // サーバーからユーザーIDを受信する
        socket.on('userID', (userID) => {
            console.log('サーバーから受信したユーザーID:', userID);

            // userIDが空の場合登録
            if(userID!=null){
                options.uid=userID;
                this.persons=[{"x":this.canvas.width/2,"y":this.canvas.height/2,"uid":userID}]
            }
            this.render()
        });

        socket.on("userMoved",(data)=>{
            this.persons=data["persons"]
            const room=data["room"];
            if(options.channel==room){
                this.render();
                this.adjustVolume();
            }
        })
    }

}

// class Avatar{
//     constructor(uid,x,y){
//         this.setPos(x,y)
//         this.uid=uid
//         this.color="blue"
//         this.r=5
//     }
//     setPos(x,y){
//         this.x=x;
//         this.y=y;
//     }
//     movePos(dx,dy,width,height){
//         const x2=this.x+dx;
//         const y2=this.y+dy;
//         this.x=Math.max(Math.min(x2,width-this.r),this.r);
//         this.y=Math.max(Math.min(y2,height-this.r),this.r);
//     }
//     draw(ctx){

//     }

// }
// class MyAvatar extends Avatar{
//     constructor(x,y){
//         const uid=options.uid;
//         super(uid,x,y);
//     }

// }


document.addEventListener("DOMContentLoaded",()=>{
    const meta2d=new Meta2D();
})

