const { admin, db } = require('../util/admin.js');
const { config } = require('../util/config.js');
const firebase = require('firebase');
firebase.initializeApp(config);
const { validateSignUpData, validateLoginData, validateUserDetails } = require('../util/validators.js');
const signUp = (req, res) => {
    console.log(req.body);
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
    console.log(newUser);
    const { valid, errors } = validateSignUpData(newUser)
    if (!valid) return res.status(400).json(errors);
    else {
        let token, userId;
        db.doc(`/users/${newUser.handle}`).get()
            .then(doc => {
                if (doc.exists) {
                    return res.status(400).json({ handle: 'this Handle is already taken' });
                }
                else {
                    return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
                }
            })
            .then(data => {
                userId = data.user.uid;
                return data.user.getIdToken();
            })
            .then(token_var => {
                token = token_var;
                const userDetails = {
                    handle: newUser.handle,
                    email: newUser.email,
                    createdAt: new Date().toISOString(),
                    userId: userId,
                    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/rooster-a8505.appspot.com/o/IMG_2441.JPG?alt=media'
                };
                return db.doc(`/users/${newUser.handle}`).set(userDetails);

            }).then(() => {
                return res.status(201).json({ token });
            })
            .catch(err => {
                if (err.code === 'auth/email-already-in-use') {
                    return res.status(400).json({ email: 'Email already in use' })
                }
                else {
                    return res.status(500).json({ general: 'Something went wrong, please try again' });
                }
            })


    }

};

const login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };
    const { valid, errors } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);
    else {
        firebase.auth().signInWithEmailAndPassword(user.email, user.password)

            .then(data => {
                return data.user.getIdToken()
            })
            .then(token => {
                return res.status(200).json({ token })
            })
            .catch(err => {
                if (err.code === 'auth/wrong-password') {
                    return res.status(403).json({ general: 'Wrong Password' })
                }
                else {
                    return res.status(500).json({ error: err.code });
                }
            })
    }
}

const uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });
    let imageFileName;
    let imageToBeUploaded = {};
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype != 'image/jpeg' && mimetype != 'image/png') {

            return res.status(400).json({ error: "Please Upload .jpeg or .png images only" });
        }
        else {
            const imageExtension = filename.split('.').pop();
            imageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`;
            const filepath = path.join(os.tmpdir(), imageFileName);
            imageToBeUploaded = { filepath, mimetype };
            file.pipe(fs.createWriteStream(filepath));
        }
    })

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        }).then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            console.log(imageUrl);
            return db.collection('users').doc(`${req.user.handle}`).update({ imageUrl });

        }).then(() => {
            return res.status(200).json({ message: "Image Uploaded Successfully" })
        }).catch(err => {
            return res.status(500).json({ error: err.code })
        });
    });
    busboy.end(req.rawBody);
};

//Add User Details

const addUserDetails = (req, res) => {

    let userDetails = validateUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            res.status(201).json({ message: "deatials added successfully" });
        })
        .catch((err) => {
            return res.json({ err: err.code })
        })

}

const getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            })
            return db.collection('/notifications').where('recipient', '==', req.user.handle).orderBy('createdAt', 'desc').limit(10).get();

            //return db.doc(`/notifications/2ruatf0Qta90PV9GBZYb`).get();
        }).then(data => {
            userData.notifications = [];
            data.forEach(doc => {
               userData.notifications.push({
                   recipient: doc.data().recipient,
                   sender: doc.data().sender,
                   createdAt: doc.data().createdAt,
                   read: doc.data().read,
                   type: doc.data().type,
                   screamId: doc.data().screamId,
                   notificationId : doc.id

               })

            })
    
            res.status(200).json(userData);

        })
        .catch(err => {
            return res.status(500).json({ error: err.code });
        })
}

const getAnyUserDetails = (req, res) => {
let userData = {};
db.doc(`/users/${req.params.handle}`).get()
.then(doc => {
    if (doc.exists) {
        userData.user = doc.data();
        return db.collection('screams').where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc').get();
    }
    else {
        return res.status(404).json({message: "User not found"})
    }
}).then(data=> {
    userData.screams=[];
    data.forEach(doc=> {
        userData.screams.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            screamId: doc.id
        })
    })
    return res.json(userData);
})
.catch(err => {
   return res.status(500).json({err: err});
})
}

const markNotificationsRead = (req, res) => {
let batch = db.batch();
req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true});
})
batch.commit().then(()=>{
    return res.json({message: 'Notifications marked read'})
})
.catch(err=> {
    return res.status(500).json({error: err.code});
})
}


module.exports = { signUp, login, uploadImage, addUserDetails, getUserDetails, getAnyUserDetails, markNotificationsRead };