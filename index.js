const express=require('express');
const session=require('express-session')
const cookieParser=require('cookie-parser')
const app=express();
const client=require('mongodb').MongoClient;
let dbinstance;
let LibBooks;
let LibUsers
client.connect("mongodb://127.0.0.1:27017").then((database)=>{
    dbinstance=database.db("Library");
    LibUsers=dbinstance.collection('Users');
    LibBooks=dbinstance.collection('Books');
    console.log('Db connected')
}).catch((err)=>{console.log(err)})
app.set('view engine','ejs')
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(session({
    secret:"Assignment 6",
    saveUninitialized:true,
    resave:false,
    cookie:{
        maxAge:100*60*24*24
    }
}))
app.use(cookieParser())
app.get('/',(req,res)=>{
    let session="";
    if(req.session.cardNumber!=null){
        session=req.session.cardNumber
    }
    LibBooks.find({}).toArray().then((x)=>{
        res.render("home",{arr:x,session:session})
    }).catch(err=>{console.log(err)})
})
app.get('/login',(req,res)=>{
    res.render('login')
})
app.post('/login',(req,res)=>{
    LibUsers.findOne({cardNumber:req.body.cardNumber}).then((result)=>{
        if(result!=null){
            req.session.cardNumber=req.body.cardNumber
            LibBooks.find({}).toArray().then((x)=>{
                res.render("home",{arr:x,session:req.session.cardNumber})
            }).catch(err=>{console.log(err)})
        }
        else{
            res.render('error',{error:"Error: Invalid Card Number"})
        }
    }).catch((err)=>{console.log(err)})
})

app.get('/borrow/:name',(req,res)=>{
    if(req.session.cardNumber!=null){
        LibBooks.updateOne({Title:req.params.name},{$set:{status:1}}).then((result)=>{}).catch((err)=>{})
        LibUsers.findOne({cardNumber:req.session.cardNumber}).then((x)=>{
            LibUsers.updateOne({cardNumber:req.session.cardNumber},{$set:{borrowed:req.params.name+"/"+x.borrowed}}).then((result)=>{
                res.render('success',{message:"Borrowed",session:req.session.cardNumber})
            })
            
        }).catch((err)=>{console.log(err)})
    }
    else{
        res.redirect("/error")
    }
})

app.get('/profile',(req,res)=>{
    if(req.session.cardNumber!=null){
        LibUsers.findOne({cardNumber:req.session.cardNumber}).then((x)=>{
            if(x.borrowed==""){
                res.render('profile',{record:"",session:req.session.cardNumber})
            }
            else{
                let arr=x.borrowed.split("/");
                async function getBooks(){
                    let borrowedBooks=await Promise.all(arr.map((book)=>{
                             return LibBooks.findOne({Title:book}).then((y)=>{
                                if(y==null){
                                    console.log("error");
                                    return null;
                                }
                                else{
                                    return y;
                                }
                        })
                    }))
                    borrowedBooks = borrowedBooks.filter((book) => book !== null);
                    res.render('profile',{record:borrowedBooks,session:req.session.cardNumber})
                }
                getBooks();
            }
        }).catch((err)=>{console.log(err)})
    }
    else{
        res.redirect('/error')
    }
})
app.get('/return/:name',(req,res)=>{
    LibBooks.updateOne({Title:req.params.name},{$set:{status:0}}).then((result)=>{}).catch((err)=>{})
    LibUsers.findOne({cardNumber:req.session.cardNumber}).then((user)=>{
        let books=user.borrowed.split('/')
        let newborrowed="";
        books=books.filter((x)=>{return x!=req.params.name})
        console.log(books)
        books.forEach((x)=>{
            if(newborrowed==""){
                newborrowed=x;
            }
            else if(x!=req.params.name && newborrowed!=""){
                newborrowed=newborrowed+"/"+x;
            }
        })
        LibUsers.updateOne({cardNumber:req.session.cardNumber},{$set:{borrowed:newborrowed}}).then((result)=>{
            res.render('success',{message:"returned",session:req.session.cardNumber
        })
        }).catch((err)=>{console.log(err)})
    }).catch((err)=>{console.log(err)})
})
app.get('/logout',(req,res)=>{
    req.session.destroy()
    res.redirect('/')
})
app.get('/error',(req,res)=>{
    res.render('error',{error:"Error: You must be logged in to perform this operation"})
})
app.use(express.static('public'));
app.get('*',(req,res)=>{
    res.status(404).sendFile(__dirname+'/public/notfound.html')
})
app.listen(3000,(err)=>{
    if(err){
        console.log("Server Disconnected")
    }
    else{
        console.log("Server Connected")
    }
})