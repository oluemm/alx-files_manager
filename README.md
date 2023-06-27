<h1 style="text-align: center;">
	<a href='https://intranet.alxswe.com/projects/1246'>
		ALX Files Manager
	</a>
</h1>

This project is a summary of this back-end trimester: authentication, NodeJS, MongoDB, Redis, pagination and background processing.

The objective is to build a simple platform to upload and view files:
* User authentication via a token
* List all files
* Upload a new file
* Change permission of a file
* View a file
* Generate thumbnails for images

### Testing endpoints
#### Task 2
```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/status ; echo ""
{"redis":true,"db":true}
imitor＠excalibur»~➜ sudo systemctl stop redis-server.service
imitor＠excalibur»~➜ curl 0.0.0.0:5000/status ; echo ""
{"redis":false,"db":true}
```
#### Task 3
```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "email": "bob@dylan.com", "password": "toto1234!" }' ; echo ""
{"id":"649a9c608b464592010e314a","email":"bob@dylan.com"}
```

```
imitor＠excalibur»~➜ echo 'db.users.find()' | mongosh files_manager
files_manager> db.users.find()
[
  {
    _id: ObjectId("649a9c608b464592010e314a"),
    email: 'bob@dylan.com',
    password: '89cad29e3ebc1035b29b1478a8e70854f25fa2b2'
  }
]
files_manager> % 
imitor＠excalibur»~➜
```

```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "email": "bob@dylan.com", "password": "toto1234!" }' ; echo ""
{"error":"Already exist"}
```

```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "email": "bob@dylan.com" }' ; echo ""
{"error":"Missing password"}
```
```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/users -XPOST -H "Content-Type: application/json" -d '{ "password": "bob@dylan.com" }' ; echo ""
{"error":"Missing email"}
```
#### Task 4
```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/connect -H "Authorization: Basic Ym9iQGR5bGFuLmNvbTp0b3RvMTIzNCE=" ; echo ""
{"token":"474426f4-fa66-4cbb-8c45-359faa3cbb09"}
```
```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/users/me -H "X-Token: 474426f4-fa66-4cbb-8c45-359faa3cbb09" ; echo ""
{"id":"649a9c608b464592010e314a","email":"bob@dylan.com"}
```
```
imitor＠excalibur»~➜ curl 0.0.0.0:5000/disconnect -H "X-Token: 474426f4-fa66-4cbb-8c45-359faa3cbb09" ; echo ""

imitor＠excalibur»~➜ curl 0.0.0.0:5000/users/me -H "X-Token: 474426f4-fa66-4cbb-8c45-359faa3cbb09" ; echo ""
{"error":"Unauthorized"}
```

### Author(s)

[**Emmanuel Fasogba**](https://www.linkedin.com/in/emmanuelofasogba/)
- GitHub - [fashemma007](https://github.com/fashemma007)
- Twitter - [@tz_emiwest](https://www.twitter.com/tz_emiwest)
