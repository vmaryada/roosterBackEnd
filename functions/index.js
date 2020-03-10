const functions = require('firebase-functions');
const { getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream} = require('./handlers/screams.js');
const {signUp, login, uploadImage, addUserDetails, getUserDetails, getAnyUserDetails, markNotificationsRead} = require('./handlers/users.js');
const {FBAuth} = require('./util/FBAuth.js');
const {db} = require('./util/admin.js');
const app = require('express')();
const cors = require('cors');
app.use(cors());
/*const firebase = require('firebase');

firebase.initializeApp(config);*/


app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

//Sign Up Route
app.post('/signup', signUp);

//Login Route
app.post('/login', login);

//Image Upload
app.post('/user/image', FBAuth, uploadImage);

//Add user details
app.post('/user', FBAuth, addUserDetails);

//Get Authenticated user details
app.get('/user', FBAuth, getUserDetails);

//Get Any User Details from user Handle
app.get('/user/:handle', getAnyUserDetails);

//Route for Reading Notifications
app.post('/notifications', FBAuth, markNotificationsRead);

//Get Scream from Id in URL
app.get('/scream/:screamId', getScream);

//Comment on Scream
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);

//Like & Unlike a Scream
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);

//Delete a Scream
app.delete('/scream/:screamId', FBAuth, deleteScream);

exports.api = functions.https.onRequest(app);


//Notification when like
exports.createNotificationOnLike = functions.firestore.document(`likes/{id}`)
.onCreate((snapshot) => {
   return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc => {
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt : new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'like',
                read: false,
                screamId : doc.id
            })
        }
    })
    /*.then(()=> {
        return;
    })*/
    .catch(err=>{
console.error(err);
    })
})

/*exports.createNotificationOnLike = functions
  .region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });*/
//Delete Notification when unlike
exports.deleteNotificationOnUnlike = functions.firestore.document(`likes/{id}`)
.onDelete((snapshot) => {
   return db.doc(`/notifications/${snapshot.id}`).delete()
    .catch(err=>{
        console.error(err);
    })
    })
//Notification when Comment
exports.createNotificationOnComment = functions.firestore.document(`comments/{id}`)
.onCreate((snapshot) => {
   return db.doc(`/screams/${snapshot.data().screamId}`).get()
    .then(doc => {
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt : new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'comment',
                read: false,
                screamId : doc.id
            })
        }
    })
    .catch(err=>{
console.error(err);
    })
})

exports.onUserImageChange = functions.firestore.document('users/{userId}').onUpdate((change)=> {
     if(change.before.data().imageUrl !== change.after.data().imageUrl)
     {
        let batch = db.batch();
        
        return db.collection('screams').where('userHandle', '==', change.before.data().handle).get()
        .then(data => {
            data.forEach((doc) => {
                const scream = db.doc(`/screams/${doc.id}`);
                batch.update(scream, {userImage: change.after.data().imageUrl});
            })
            return batch.commit();
        })
     }
     else return true;
})

exports.onScreamDelete = functions.firestore.document('/screams/{screamId}')
.onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db.collection('notifications').where('screamId', "==", screamId).get()
.then(data => {
    data.forEach(doc => {
        batch.delete(db.doc(`/notifications/${doc.id}`))
    })
    return batch.commit();
})
.catch(err => {
    console.error(err);
})

})