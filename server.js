// env
require('dotenv').config()

const methodOverride = require('method-override')
const bodyParser = require('body-parser')
const express = require('express')


const MongoClient = require('mongodb').MongoClient

const app = express()
const PORT = process.env.PORT

app.use('/public', express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.use(methodOverride('_method'))

app.set('view engine', 'ejs')


var db;

MongoClient.connect(process.env.DB_URL,{ useUnifiedTopology: true }, (err, client)=>{

    if(err) return console.log(err)

    db = client.db('todoApp')

    // db.collection('post').insertOne( {이름 : 'John', _id : 100} , function(에러, 결과){
	//     console.log('저장완료'); 
	// });

    app.listen(PORT, () => {
        console.log(`The Express server is listennong at port: ${PORT}`)
    })

})


app.get('/', (req, res, next)=> {
    console.log('Middleware1')
    next()
})

app.get('/user/:id', (req, res)=> {
    console.log('Middleware2')
    res.send('user' + req.params.id)
})

app.get('/index', (req, res) => {
    // res.sendFile(__dirname +'/public/index.html')
    res.render('index.ejs')
})

app.post('/add', (req, res) => {
    console.log(req.body.title)
    console.log(req.body.date)

    db.collection('counter').findOne({name : '게시물갯수'}, (err, result) => {
        console.log(result.totalPost)
        const totalPost = result.totalPost;

        // 게시물 마다 id 번호를 단다! 컬렉션안에 또 컬렉션을 다는군...
        db.collection('post').insertOne({_id : totalPost + 1, title : req.body.title, date : req.body.date} , function(에러, 결과){
            console.log('저장완료'); 
            // counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야 함(수정)
            db.collection('counter').updateOne({name: '게시물갯수'},{ $inc : {totalPost:1} }, (err, result)=> {
                if(err) return console.log(err)
            })
            res.redirect('/list')
        });
    });

    // res.redirect('/list')       // 여기로 하면! 새로고침해야 나옴! collection 아래에 하는 것!
})

app.get('/write', (req, res) => {
    // res.sendFile(__dirname +'/public/write.html')
    res.render('write.ejs')
})

// list 로 get요청으로 접속
app.get('/list', (req, res) => {
    
    db.collection('post').find().toArray((err, result) => {     // 전체 리스트로 가져올 때 find().toArray()
        console.log('list 결과: ', result)
        res.render('list.ejs', { posts : result })      // views폴더내에 들어가야 됨!
    });
    
})

app.get('/search', (req, res) => {
    console.log(req.query)
    db.collection('post').find({title:req.query.value}).toArray((err, result) => {
        console.log(result)
        res.render('result.ejs', { posts : result})
    })
})

app.delete('/delete', (req, res) => {
    console.log(req.body)
    req.body._id = parseInt(req.body._id)

    db.collection('post').deleteOne(req.body, (err, result) => {
        console.log('삭제완료')
        res.status(200).send({ message : '삭제 성공했습니다.'})
    })
    // res.send('삭제완료')
})

app.get('/detail/:id', (req, res)=> {
    console.log(req.params.id)

    db.collection('post').findOne({_id : parseInt(req.params.id)}, (err, result) => {
        console.log(result)
        res.render('detail.ejs', { data : result })
    })
})


app.get('/edit/:id', (req, res) => {
    db.collection('post').findOne({_id : parseInt(req.params.id)}, (err, result) => {
        console.log('edit', result)
        res.render('edit.ejs', { post : result})
    })
})


app.put('/edit', (req, res) => {
    db.collection('post').updateOne({ _id : parseInt(req.body.id)}, { $set : { title : req.body.title, date : req.body.date}}, (err, result) => {
        console.log('title: ',  req.body.title)
        console.log('date: ', req.body.date)
        console.log('수정완료')
        res.redirect('/list')
    })
})


const passport = require('passport')
const LocalStrategy = require('passport-local')
const session = require('express-session')

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}))
app.use(passport.initialize())
app.use(passport.session())


app.get('/login', (req, res) => {
    res.render('login.ejs')
})

app.post('/login', passport.authenticate('local', {
    failureRedirect : '/fail'
}), (req, res) => {
    res.redirect('/')
})

app.get('/mypage', isLogin, (req, res) => {     // 미들웨어 쓰는 법
    console.log(req.user)
    res.render('mypage.ejs', {user : req.user})
})

function isLogin(req, res, next){
    if(req.user){
        next()
    } else {
        res.send('로그인하시기 바랍니다.')
    }

}

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,

    }, function (입력한아이디, 입력한비번, done) {
    console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: 'test' }, function (err, result) {
        if (err) return done(err)
    
        if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
        if ('test' == result.pw) {
            return done(null, result)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}))

passport.serializeUser((user, done) => {
    done(null, user.id)
})


// deserializeUser()에서 찾은 유저 정보를 mypage.ejs에 보냄
passport.deserializeUser((id, done) => {
    // db에 있는 user.id로 유저를 찾은 뒤에 유저 정보를 done(null, {요기에 넣음})
    db.collection('login').findOne({ id: id}, (err, result) => {
        done(null, result)
        
    } )
})