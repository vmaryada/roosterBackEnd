
const { db } = require('../util/admin.js');

const getAllScreams = (req, res) => {
    db.collection('screams').orderBy('createdAt', 'desc').get()
        .then(data => {
            let screams = [];
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount,
                    userImage: doc.data().userImage
                });
            })
            return res.json(screams);
        })
        .catch((err) => console.log(err));
}

const postOneScream = (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    db.collection('screams')
        .add(newScream)
        .then(doc => {
            const resScream = newScream;
            resScream.screamId = doc.id;
            res.json(resScream);
        })
        .catch(err => {
            res.status(200).json({ error: "something went wrong" });

        })
};

const getScream = (req, res) => {
let screamData = {};

db.doc(`/screams/${req.params.screamId}`).get()
.then(doc=>{
    if(!doc.exists)
    {
        return  res.status(404).json({error: 'Scream not found'})
    }
    screamData = doc.data();
    screamData.screamId = doc.id;
    return db.collection('comments').orderBy('createdAt', 'desc').where('screamId', '==', req.params.screamId).get();
})
.then((data) => {
screamData.comments=[];
data.forEach((doc) => {
    screamData.comments.push(doc.data())
})
return res.json(screamData);
})
.catch(err => {
    res.status(500).json({error : err.code});
})
}

const commentOnScream = (req, res) => {

  if(req.body.body.trim() === '') return res.status(400).json({comment: 'Must not be empty'}); 
  else 
  { 
  const commentData = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        userHandle: req.user.handle,
        screamId : req.params.screamId,
        userImage: req.user.imageUrl
    }

db.doc(`/screams/${req.params.screamId}`).get()
.then(doc => {
    if(!doc.exists){
        return res.status(404).json({error: "scream not found"});
    }
    else
    {
        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    } 
}).then(() => {
    return db.collection('comments').add(commentData);
})
.then(()=>{
    res.json(commentData);
})
.catch(err=>{
    res.json({err})
})
  }

}

const likeScream = (req, res) => {

    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);
 
    let screamData = {};
    screamDocument.get().then(doc=>{
        if(doc.exists)
        {
            screamData = doc.data();
            screamData.screamId = doc.id;
            return likeDocument.get();
        }
        else{
            res.status(404).json({message: "scream not found"});
        }
    })
    .then(data => {
        if(data.empty) {
            return db.collection('likes').add({
                screamId: req.params.screamId,
                userHandle: req.user.handle
            })
            .then(()=>{
            screamData.likeCount++;
            return screamDocument.update({likeCount: screamData.likeCount});    
            })
            .then(()=> {
                return res.json(screamData);
            })
        }
        else{
            return res.status(400).json({error: 'Scream already liked'});
        }
    })
    .catch((err)=> {
        console.log(err);
        res.status(500).json({error: err.code});
    })

}

const unlikeScream = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);
 
    let screamData = {};
    screamDocument.get().then(doc=>{
        if(doc.exists)
        {
            screamData = doc.data();
            screamData.screamId = doc.id;
            return likeDocument.get();
        }
        else{
            res.status(404).json({message: "scream not found"});
        }
    })
    .then(data => {
        if(data.empty) {
            return res.status(400).json({error: 'Scream Doesnt exist '});
        }
        else{
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(()=>{
                screamData.likeCount--;
                return screamDocument.update({likeCount: screamData.likeCount});
            })
            .then(()=>{
                res.json(screamData);
            })
        }
    })
    .catch((err)=> {
        console.log(err);
        res.status(500).json({error: err.code});
    })

}

const deleteScream = (req, res) => {
    const screamData = db.doc(`/screams/${req.params.screamId}`)
    
    screamData.get()
    .then(doc => {
        if (!doc.exists) 
        {
            res.status(404).json({message: "scream not found"});
        }
        else if(req.user.handle !== doc.data().userHandle) {
            res.status(403).json({message: "UnAuthorized"});
        }
        else if(req.user.handle === doc.data().userHandle)
        {
            return screamData.delete();
        }
    })
    .then(()=>{
       //Then to get Comments Data
        return db.collection('comments').where('screamId', '==', req.params.screamId).get();
     })
    .then((commentsDoc)=>{
       // Then to delete Comments and get Likes Data
       commentsDoc.forEach( doc => {
           doc.ref.delete();
       })
       return db.collection('likes').where('screamId', '==', req.params.screamId).get();
    })
    .then((likesDoc)=>{
      // Then to delete likes and return message to the user
        likesDoc.forEach( doc => {
            doc.ref.delete();
        })
        return res.status(200).json({message: "Scream Data along with likes and comments have been deleted"});
     })

    .catch((err) => {
        res.status(500).json({error : err.code})
    })

}

module.exports = { getAllScreams, postOneScream, getScream, commentOnScream, likeScream, unlikeScream, deleteScream };