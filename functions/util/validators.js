const isEmpty = (string) => {
    if(string.trim() === ''){return true;}
    else { return false;}
}

const isEmail = (email) => {
const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
if( email.match(regEx))
{
    return true;
}
else { return false;}
}
const validateSignUpData = (newUser) => {
    console.log(newUser);
    let errors = {};
    if (isEmpty(newUser.email)) {
        errors.email = 'Email field cannot be empty';
    }
    else if (!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email';
    }
    if (isEmpty(newUser.password)) {
        errors.password = 'Password field cannot be empty'
    }
    if (newUser.password !== newUser.confirmPassword) {
        errors.passwordMatch = 'Passwords do not match'
    }
    if (isEmpty(newUser.handle)) {
        errors.handle = 'User Handle field cannot be empty'
    }
    return {
    errors, valid : Object.keys(errors).length === 0 ? true : false
    }
}

const validateLoginData = (user) => {
    let errors = {};
    if (isEmpty(user.email)) errors.email = 'Email cannot be empty';
    else if (!isEmail(user.email)) errors.email = 'Must be a valid Email';
    if (isEmpty(user.password)) errors.password = 'Password cannot be empty';
    return {
        errors, valid : Object.keys(errors).length === 0 ? true : false
        }

}

const validateUserDetails = (data)=> {
   

        let userDetails = {};
    
        if(!isEmpty(data.bio.trim())) {userDetails.bio = data.bio}
        if(!isEmpty(data.website.trim())) {
            if(data.website.substring(0,4) !== 'http' )
            {
                userDetails.website = `http://${data.website}`;
            }
            else
            {
                userDetails.website = data.website;
            }
        } 
        if(!isEmpty(data.location.trim())) {userDetails.location = data.location}
    
        return userDetails;
    
}

module.exports = { validateSignUpData, validateLoginData, validateUserDetails};