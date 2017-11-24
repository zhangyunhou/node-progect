"use strict";

const express = require('express');
//解析post请求体数据
const bodyParser = require('body-parser');
//文件功能增强的包
const fse = require('fs-extra');
//解析上传文件的包
const formidable = require('formidable');
//引入path核心对象
const path = require('path');
//引入数据库
const mysql = require('mysql');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'album'
});
// 创建服务器
let app = express();
//配置模板引擎
app.engine('html', require('express-art-template'));
//设置路由规则
let router = express.Router();
router.get('/', (req, res, next) => {
  //获取连接
  pool.getConnection((err, connection) => {
    //处理获取连接时的异常，比如停网了
    if (err) return next(err);
    //使用连接查询所有的album_dir所有数据
    connection.query('select * from album_dir', (error, results) => {
      connection.release();
      //处理查询时带来的异常，比如表名错误
      if (err) return next(err);
      res.render('index.html', {
        album: results
      });
    });
  });
})
  //增加相册
  .post('/addDir', (req, res, next) => {
    //获取连接
    pool.getConnection((err, connection) => {
      let dirname = req.body.dirname;
      //处理获取连接时的异常，比如停网了
      if (err) return next(err);
      //使用连接查询所有的album_dir所有数据
      connection.query('insert into album_dir values (?)', [dirname], (error, results) => {
        connection.release();
        //处理查询时带来的异常，比如表名错误
        if (err) return next(err);
        //声明目录
        const dir = `./resource/${dirname}`;
        //确保目录存在
        fse.ensureDir(dir, err => {
          //重新看一看相册
          res.redirect('/showDir?dir=' + dirname);
        });
      });
    });
  })
  //显示照片列表
  .get('/showDir', (req, res, next) => {
    //获取连接
    let dirname = req.query.dir;
    pool.getConnection((err, connection) => {
      //处理获取连接时的异常，比如停网了
      if (err) return next(err);
      //使用连接查询所有的album_dir所有数据
      connection.query('select * from album_file where dir = ?', [dirname], (error, results) => {
        connection.release();
        //处理查询时带来的异常，比如表名错误
        if (err) return next(err);
        res.render('album.html', {
          album: results,
          dir: dirname
        });
      });
    });
  })
  //添加照片
  .post('/addPic', (req, res, next) => {
    var form = new formidable.IncomingForm();


    let rootPath = path.join(__dirname, 'resource');
    //设置默认上传目录
    form.uploadDir = rootPath;
    form.parse(req, function (err, fields, files) {
      if (err) return next(err);

      //移动文件
      // console.log(fields); //将字符串数据封装成对象 { dir: 'love' }
      //通过移动resource下的资源到指定文件夹目录
      // fse.move(rootPath)
      // console.log(path.parse(files.pic.path).base);
      // console.log(files); // 是一个对象.pic也是一个对象

      let filename = path.parse(files.pic.path).base;
      // console.log(files.pic.path);
      //移动文件            resource  e       名称
      let dist = path.join(rootPath, fields.dir, filename);
      fse.move(files.pic.path, dist, (err) => {
        if (err) return next(err);
        // console.log('移动成功');

        //将数据保存进数据库
        //file:/resource/vvvb/upload_dd10f264c02f08e9031a0bd3f7eb090a
        let db_file = `/resource/${fields.dir}/${filename}`;
        let db_dir = fields.dir;

        pool.getConnection((err, connection) => {
          //处理获取连接时的异常，比如停网了
          if (err) return next(err);
          //使用连接查询所有的album_dir所有数据
          connection.query('insert into album_file values (?,?)', [db_file, db_dir], (error, results) => {

            //查询完毕以后，释放连接
            connection.release();
            //处理查询时带来的异常，比如表名错误
            if (err) return next(err);
            //重定向到看相片的页面
            res.redirect('/showDir?dir=' + db_dir);
          })
        });
      });
    });
  })
// /public/vender/bootstrap/js/bootstrap.js
app.use('/public', express.static('./public'));
//向外暴露相片静态资源目录
app.use('/resource', express.static('./resource'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());
app.use(router);
app.use((err, req, res, next) => {
  console.log('出错啦.-------------------------');
  console.log(err);
  console.log('出错啦.-------------------------');
  res.send(`
          您要访问的页面出异常拉...请稍后再试..
          <a href="/">去首页玩</a>
  `);
});
app.listen('8888');

