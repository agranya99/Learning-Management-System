const express = require('express')
const joi = require('joi')
const app = express()
var _ = require('lodash');

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('./public'))

app.set('views', './views')
app.set('view engine', 'pug')

const portNumber = 8080

var user_details = {
    'admin': {
        'name': 'Admin',
        'password': '1234',
        'designation': 2
    },
    'faculty1': {
        'name': 'Dr. Sridevi',
        'password': '1234',
        'designation': 1
    },
    'faculty2': {
        'name': 'Dr. Prabhakar',
        'password': '1234',
        'designation': 1
    },
    'student1': {
        'name': 'Rajitha',
        'password': '1234',
        'designation': 0
    },
    'student2': {
        'name': 'Ramesh',
        'password': '1234',
        'designation': 0
    },
    'student3': {
        'name': 'Mohan',
        'password': '1234',
        'designation': 0
    }

}

var course_details = {
    'CSE1001': {
        'desc': "Problem Solving",
        'professors': ['faculty1', 'faculty2'],
        'startDate': new Date("2020-02-20"),
        'duration': 30
    },
    'CSE1002': {
        'desc': "Data Structures and Algorithms",
        'professors': ['faculty1'],
        'startDate': new Date("2020-02-21"),
        'duration': 60
    }
}

var registrations = {
    'CSE1001': { 'faculty1': ['student1', 'student2'], 'faculty2': ['student3'] },
    'CSE1002': { 'faculty1': ['student1', 'student3'] },
}


var sessions = {}

const auth_token_authenticator = joi.string().length(26).required()
const courseCode_authenticator = joi.string().regex(/^[A-Z]{3}[0-9]{4}$/).required()

const validators = {
    'authorized': {
        'auth_token': auth_token_authenticator
    },
    'login': {
        'username': joi.string().required(),
        'password': joi.string().required(),
        'nogui': joi.boolean()
    },
    'addUser': {
        'auth_token': auth_token_authenticator,
        'username': joi.string().required(),
        'name': joi.string().required(),
        'password': joi.string().required().length(4),
        'designation': joi.number().required(),
        'nogui': joi.boolean()
    },
    'delUser': {
        'auth_token': auth_token_authenticator,
        'userId': joi.string().required(),
        'nogui': joi.boolean()
    },
    'addCourse': {
        'auth_token': auth_token_authenticator,
        'courseCode': courseCode_authenticator,
        'courseDesc': joi.string().required(),
        'courseStartDate': joi.date().required(),
        'courseDuration': joi.number().required(),
        'nogui': joi.boolean()
    },
    'courseDetails': {
        'auth_token': auth_token_authenticator,
        'courseCode': courseCode_authenticator,
        'courseProfs': joi.string(),
        'prof': joi.string(),
        'nogui': joi.boolean()
    },
    'subscribeCourse': {
        'auth_token': auth_token_authenticator,
        'courseCode': courseCode_authenticator,
        'prof': joi.string().required(),
        'nogui': joi.boolean()
    }
}


//Utility Function - for validating request body
var validateRequest = function requestValidation(reqBody, validator) {
    const promise = new Promise(function (resolve, reject) {
        const result = joi.validate(reqBody, validators[validator])
        if (result.err) {
            return reject(result)
        }
        else {
            resolve(result)
        }
    })
    return promise
}

//Utility Function - for checking if record exists in data
var hasRecord = function findRecord(data, record) {
    const promise = new Promise(function (resolve, reject) {
        if (!(_.has(data, record))) {
            return reject()
        }
        else {
            resolve()
        }
    })
    return promise
}


function generateAuthToken() {
    return Math.random().toString(36).substring(2, 15).padEnd(13) + Math.random().toString(36).substring(2, 15).padEnd(13);
}

// function to generate variables required for rendering home
function homeRenderData(current_user) {
    var details =  {
        'name' : user_details[current_user]['name'],
        'designation' : user_details[current_user]['designation']
    }

    // list of all courses, users
    var courseList = []
    var userList = []
    _.forIn(course_details, (course, courseCode) => {
        courseList.push({
            'courseCode': courseCode,
            'courseDesc': course['desc'],
            'courseProfs': course['professors'],
            'courseDuration': course['duration'],
            'registrations': JSON.stringify(registrations[courseCode])
        })
    })

    _.forIn(user_details, (user, username) => {
        if (user['designation'] == 1 || user['designation'] == 0) {
            userList.push({
                'userId': username,
                'userName': user['name']
            })
        }
    })

    details['courseList'] = courseList
    details['userList'] = userList

    // list of all registered courses for a student
    if (details['designation'] == 0) {
        var registeredCourses = []
        for (var courseCode in registrations) {
            _.forIn(registrations[courseCode], (students, professor) => {
                if (students.indexOf(current_user) != -1) {
                    registeredCourses.push({
                        'courseCode': courseCode,
                        'courseDesc': course_details[courseCode]['desc'],
                        'courseProfs': course_details[courseCode]['professors'],
                        'courseDuration': course_details[courseCode]['duration']
                    })
                }
            })
        }
        details['registeredCourseList'] = registeredCourses
    }

    // list of all courses a professor is teaching 
    if (details['designation'] == 1) { 
        var registeredCourses = []
        _.forIn(course_details, (course, courseCode) => {
            if (course['professors'].indexOf(current_user) != -1) {
                registeredCourses.push({
                    'courseCode': courseCode,
                    'courseDesc': course['desc'],
                    'courseProfs': course['professors'],
                    'courseDuration': course['duration']
                })
            }
        })
        details['registeredCourseList'] = registeredCourses
    }
    return details
}

// Authenticated access middleware
app.use((req, res, next) => {
    // validate request body
    var auth_validator = joi.object(validators['authorized']).unknown() 
    const result = auth_validator.validate(req.body)

    // if validation fails (token was not provided)
    if (result.error) {
        // if seeking authentication, then allow access without token
        if (req.url === '/' || req.url === '/signup' || req.url === '/login') {
            return next()
        }
        return res.redirect('/')
    } else {
        // check if session with that token doesn't exist
        if (!(result.value.auth_token in sessions)) {
            return res.status(400).render('landing', {'message':"Session not found. Please Login Again."})
        } else {
            // All OK
            if(req.url === '/' || req.url === '/home') {
                    var current_user = sessions[result.value.auth_token]
                    var responseData = homeRenderData(current_user)
                    responseData['auth_token'] = result.value.auth_token
                    return res.render('home', responseData)
            }

            // allow access
            return next()
        }
    }
})

app.post('/login', (req, res) => {
    // validate request body
    validateRequest(req.body, 'login')
        .then((result) => {
            // check if username does not exists in DB
            hasRecord(user_details, result.username)
                .then(() => {
                    // check if password does not match
                    if (result.password !== user_details[result.username]['password']) {
                        res.status(400).render('landing', { 'message': "Entered Password is Incorrect." })
                    } else {
                        // All OK

                        var auth_token = generateAuthToken()
                        sessions[auth_token] = result.username
                        // response
                        var responseData = homeRenderData(result.username)
                        responseData['auth_token'] = auth_token
                        if (result.nogui) {
                            res.send(responseData)
                        }
                        res.render('home', responseData)
                    }
                })
                .catch(() => {
                    res.status(400).render('landing', { 'message': "Username not found." })
                })
        })
        .catch((error) => {
            res.status(400).render('landing', { 'message': error.details[0].message })
        })
})

app.post('/addUser', (req, res) => {
    // validate request body
    validateRequest(req.body, 'addUser')
        .then((result) => {
            // check if username exists in DB (username must be unique)
            hasRecord(user_details, result.username)
                .then(() => {
                    //user exists - duplicate error
                    var responseData = homeRenderData(sessions[result.auth_token])
                    responseData['auth_token'] = result.auth_token
                    responseData['message'] = "A user with the same 'username' aleady exists."
                    res.render('home', responseData)
                },
                    () => {
                        // All OK 

                        // make a new user
                        user_details[result.username] = {
                            'name': result.name,
                            'password': result.password,
                            'designation': result.designation,
                        }
                        // response
                        var responseData = homeRenderData(sessions[result.auth_token])
                        responseData['auth_token'] = result.auth_token
                        responseData['message'] = "Successfully added user to Database."
                        res.render('home', responseData)
                    })
        })
        .catch((error) => {
            // if validations fail
            var responseData = homeRenderData(sessions[error._object.auth_token])
            responseData['auth_token'] = error._object.auth_token
            responseData['message'] = error.details[0].message
            res.render('home', responseData)
        })
})


app.post('/delUser', (req, res) => {
    // validate request body
    validateRequest(req.body, 'delUser')
        .then((result) => {
            // check if user exists in database
            hasRecord(user_details, result.userId)
                .then(() => {
                    // check if user is student / faculty
                    if (user_details[sessions[result.auth_token]]['designation'] == 0 || user_details[sessions[result.auth_token]]['designation'] == 1) {
                        var responseData = { 'message': "Oops! How did you land here? Your designation doesn't support this feature." }
                        res.render('landing', responseData)
                    } else {
                        // removing registrations (if any)
                        // if it is a faculty
                        if (user_details[result.userId]['designation'] == 1) {
                            _.forIn(registrations, (faculties, courseCode) => {
                                if (result.userId in faculties) {
                                    // if this is the only faculty taking a course - Delete the course
                                    if (course_details[courseCode]['professors'].length == 1) {
                                        delete faculties
                                        delete course_details[courseCode]
                                    }
                                    else {
                                        // otherwise delete faculty from 'Registered Faculty' List of course
                                        delete faculties[result.userId]
                                    }
                                }
                            })
                        }
                        // if it is a student
                        else {
                            _.forIn(registrations, (faculties, courseCode) => {
                                // removing all registrations for the student
                                for (var professor in faculties) {
                                    if (faculties[professor].indexOf(result.userId) != -1) {
                                        registrations[courseCode][professor].splice(faculties[professor].indexOf(result.userId), 1)
                                    }
                                }
                            })
                        }
                        // deleting user
                        delete user_details[result.userId]
                        // response
                        var responseData = homeRenderData(sessions[result.auth_token])
                        responseData['auth_token'] = result.auth_token
                        responseData['message'] = "Successfully deleted user account."
                        res.render('home', responseData)
                    }
                })
                .catch(() => {
                    // if user doesn't exist in database
                    var responseData = homeRenderData(sessions[result.auth_token])
                    responseData['auth_token'] = result.auth_token
                    responseData['message'] = "User doesn't exist in the Database."
                    res.render('home', responseData)
                })
        })
        .catch((error) => {
            // if validations fail
            var responseData = homeRenderData(sessions[error._object.auth_token])
            responseData['auth_token'] = error._object.auth_token
            responseData['message'] = error.details[0].message
            res.render('home', responseData)
        })
})

app.post('/logout', (req, res) => {
    // validate request body
    validateRequest(req.body, 'authorized')
        .then((result) => {
            // delete session
            delete sessions[result.auth_token]
            // response
            var responseData = {
                'message': "Logged out."
            }
            res.render('landing', responseData)
        })
        .catch(() => {
            res.render('landing', {'message': "Session Doesn't Exist"})
        })
})


app.post('/course', (req, res) => {
    // validate request body
    validateRequest(req.body, 'courseDetails')
        .then((result) => {
            // check if course code does not exist
            hasRecord(course_details, result.courseCode)
                .then(() => {
                    // All OK
                    // preparing data for render/delivery
                    var responseData = {
                        'courseCode': result.courseCode,
                        'courseDesc': course_details[result.courseCode]['desc'],
                        'courseStartDate': course_details[result.courseCode]['startDate'],
                        'courseProfs': course_details[result.courseCode]['professors'],
                        'courseDuration': course_details[result.courseCode]['duration'],
                        'courseCommenced': new Date() > course_details[result.courseCode]['startDate'],
                    }
                    // number of registrations
                    var numberRegistered = 0
                    if (_.has(registrations, result.courseCode)) {
                        _.forIn(registrations[result.courseCode], (value, key) => {
                            numberRegistered += value.length
                        })
                    }

                    // object having registered students 
                    var registeredStudents = registrations[result.courseCode]

                    responseData['numberRegistered'] = numberRegistered
                    responseData['registeredStudents'] = registeredStudents

                    if (user_details[sessions[result.auth_token]]['designation'] == 0) {
                        // check if student is enrolled in this course
                        responseData['enrolled'] = false
                        responseData['yourProf'] = "Not Enrolled"
                        if (_.has(registrations, result.courseCode)) {
                            _.forIn(registrations[result.courseCode], (value, key) => {
                                if (value.indexOf(sessions[result.auth_token]) != -1) {
                                    responseData['enrolled'] = true
                                    responseData['yourProf'] = key
                                }
                            })
                        }
                    }

                    if (user_details[sessions[result.auth_token]]['designation'] == 1) {
                        // check if faculty is registered with the course
                        responseData['registeredFaculty'] = false
                        if (_.has(course_details, result.courseCode)) {
                            if (course_details[result.courseCode]['professors'].indexOf(sessions[result.auth_token]) != -1) {
                                responseData['registeredFaculty'] = true
                            }
                        }
                    }
                    // add a current status of course
                    // if the course date has passed
                    if (responseData['courseCommenced']) {
                        responseData['status'] = "The course has started"

                        // if student
                        if ('enrolled' in responseData) {
                            // if enrolled in course
                            if (responseData['enrolled']) {
                                responseData['status'] += " and you have registered for it."
                            } else {
                                responseData['status'] += " and registrations are closed. You cannot register for this course."
                            }
                        }
                    } else {
                        responseData['status'] = "Course is yet to begin"
                        // if student
                        if ('enrolled' in responseData) {
                            // if enrolled in course
                            if (responseData['enrolled']) {
                                responseData['status'] += " and you've enrolled in it."
                            } else {
                                responseData['status'] += " and is open for registrations."
                            }
                        } else {
                            responseData['status'] += " and is open for registrations."
                        }
                    }
                    responseData['auth_token'] = result.auth_token
                    responseData['designation'] = user_details[sessions[result.auth_token]]['designation']
                    if (result.nogui) {
                        res.send(responseData)
                    }
                    else {
                        res.render('course', responseData)
                    }
                })
                .catch(() => {
                    var responseData = homeRenderData(sessions[result.auth_token])
                    responseData['auth_token'] = result.auth_token
                    responseData['message'] = "Course Code doesn't exist in the Database."
                    res.render('home', responseData)
                })         
        })
        .catch((error) => {
            var responseData = homeRenderData(sessions[error._object.auth_token])
            responseData['auth_token'] = error._object.auth_token
            responseData['message'] = "Select a valid option!"
            res.render('home', responseData)
        })   
})

app.post('/add', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['addCourse'])
    validateRequest(req.body, 'addCourse')
        .then((result) => {
            if (user_details[sessions[result.auth_token]]['designation'] == 0) {
                var responseData = homeRenderData(sessions[result.auth_token])
                responseData['auth_token'] = result.auth_token
                responseData['message'] = "Oops! How did you land here? Your designation doesn't support this feature."
                res.render('home', responseData)
            }
            else {
                // check if course code is in courses 
                hasRecord(course_details, result.courseCode)
                    .then(() => {

                        if (course_details[result.courseCode]['professors'].indexOf(sessions[result.auth_token]) != -1) {
                            var message = "Course Exists AND you are already a registered faculty for the course."
                        }
                        else {
                            course_details[result.courseCode]['professors'].push(sessions[result.auth_token])
                            var message = "Course Already Exists - Merging. You have been addded to the 'Registered Faculty' List for the course."
                        }
                        var responseData = homeRenderData(sessions[result.auth_token])
                        responseData['auth_token'] = result.auth_token
                        responseData['message'] = message
                        res.render('home', responseData)
                    })
                    //otherwise
                    .catch(() => {
                        // adding course to course_details
                        course_details[result.courseCode] = {
                            'desc': result.courseDesc,
                            'professors': [sessions[result.auth_token]],
                            'startDate': result.courseStartDate,
                            'duration': result.courseDuration
                        }
                        var responseData = homeRenderData(sessions[result.auth_token])
                        responseData['auth_token'] = result.auth_token
                        responseData['message'] = "Successfully created the course."
                        res.render('home', responseData)
                    })
            }
        })
        .catch((error) => {
            var responseData = homeRenderData(sessions[error._object.auth_token])
            responseData['auth_token'] = error._object.auth_token
            responseData['message'] = error.details[0].message
            res.render('home', responseData)
        })
})

app.post('/delete', (req, res) => {
    // validate the request body
    validateRequest(req.body, 'courseDetails')
        .then((result) => {
            // check if course code does not exist in courses
            hasRecord(course_details, result.courseCode)
                .then(() => {
                    // check if user is student
                    if (user_details[sessions[result.auth_token]]['designation'] == 0) {
                        var responseData = { 'message': "Oops! How did you land here? Your designation doesn't support this feature." }
                        res.render('landing', responseData)
                    } else {
                        // OK
                        if (course_details[result.courseCode]['professors'].indexOf(sessions[result.auth_token]) == -1) {
                            var responseData = homeRenderData(sessions[result.auth_token])
                            responseData['auth_token'] = result.auth_token
                            responseData['message'] = "You are not authorized to delete the course - You are not a registered faculty for the course."
                            res.render('home', responseData)
                        }
                        else {
                            //if this is the only professor taking the course
                            if (course_details[result.courseCode]['professors'].length == 1) {
                                //removing course
                                delete course_details[result.courseCode]
                                //removing registrations 
                                if (result.courseCode in registrations) {
                                    delete registrations[result.courseCode]
                                }
                                var message = "The course has been deleted successfully."
                            }
                            else {
                                //otherwise
                                //removing professor from list of professors taking the course
                                course_details[result.courseCode]['professors'].splice(course_details[result.courseCode]['professors'].indexOf(sessions[result.auth_token]), 1)
                                //removing registrations for the professor
                                if (result.courseCode in registrations) {
                                    if (sessions[result.auth_token] in registrations[result.courseCode])
                                        delete registrations[result.courseCode][sessions[result.auth_token]]
                                }
                                var message = "You have been successfully removed from the list of 'Registered Faculty' for the course."
                            }

                            var responseData = homeRenderData(sessions[result.auth_token])
                            responseData['auth_token'] = result.auth_token
                            responseData['message'] = message
                            res.render('home', responseData)
                        }
                    }
                })
                .catch(() => {
                    // course doesn't exist
                    var responseData = homeRenderData(sessions[result.auth_token])
                    responseData['auth_token'] = result.auth_token
                    responseData['message'] = "Course Code doesn't exist in the Database."
                    res.render('home', responseData)
                })
        })
        .catch(() => {
            var responseData = { 'message': "Oops! Something went wrong. Please Try Again." }
            res.render('landing', responseData)
        })
})

app.post('/participate', (req, res) => {
    // validate the request body
    validateRequest(req.body, 'courseDetails')
        .then((result) => {
            if (user_details[sessions[result.auth_token]]['designation'] == 0) {
                var responseData = { 'message': "Oops! How did you land here? Your designation doesn't support this feature." }
                res.render('landing', responseData)
            }
            else {
                // check if course code is in courses 
                if (result.courseCode in course_details) {
                    // if professor is already in 'Registered Faculty' List
                    if (course_details[result.courseCode]['professors'].indexOf(sessions[result.auth_token]) != -1) {
                        var message = "You are already a Registered Faculty for the course."
                    }
                    else {
                        // All OK
                        course_details[result.courseCode]['professors'].push(sessions[result.auth_token])
                        var message = "You have been addded to the 'Registered Faculty' List for the course."
                    }
                }
                else {
                    var message = "Course Doesn't Exist. Try creating a new one."
                }
                var responseData = homeRenderData(sessions[result.auth_token])
                responseData['auth_token'] = result.auth_token
                responseData['message'] = message
                res.render('home', responseData)
            }
        })
        .catch((error) => {
            var responseData = { 'message': "Oops! Something went wrong. Please Try Again." }
            res.render('landing', responseData)
        })
})

app.post('/subscribe', (req, res) => {
    // validate the request body
    const result = joi.validate(req.body, validators['courseDetails'])
    validateRequest(req.body, 'subscribeCourse')
        .then((result) => {
            // check if course code does not exist in courses
            hasRecord(course_details, result.courseCode)
                .then(() => {
                    // check if user is admin
                    if (user_details[sessions[result.auth_token]]['designation'] == 1) {
                        var responseData = { 'message': "Oops! How did you land here? Your designation doesn't support this feature." }
                        res.render('landing', responseData)
                    } else {
                        // check if course has started
                        if (new Date() > course_details[result.courseCode]['startDate']) {
                            var message = "Sorry! You're too late. The course is already in progress."
                        } else {
                            // All OK

                            // if course exists in registrations
                            if (result.courseCode in registrations) {
                                // adding student to registrations
                                if (result.prof in registrations[result.courseCode]) {
                                    registrations[result.courseCode][result.prof].push(sessions[result.auth_token])
                                }
                                else {
                                    registrations[result.courseCode][result.prof] = [sessions[result.auth_token]]
                                }
                            } else {
                                // adding course and student to registrations
                                registrations[result.courseCode] = {}
                                registrations[result.courseCode][result.prof] = [sessions[result.auth_token]]
                            }
                            var message = "Successfully subscribed to the course."
                        }
                        var responseData = homeRenderData(sessions[result.auth_token])
                        responseData['auth_token'] = result.auth_token
                        responseData['message'] = message
                        res.render('home', responseData)
                    }
                })
                .catch(() => {
                    // course doesn't exist
                    var responseData = homeRenderData(sessions[result.auth_token])
                    responseData['auth_token'] = result.auth_token
                    responseData['message'] = "Course Code doesn't exist in the Database."
                    res.render('home', responseData)
                })
        })
        .catch((error) => {
            var responseData = homeRenderData(sessions[error._object.auth_token])
            responseData['auth_token'] = error._object.auth_token
            responseData['message'] = "Oops! Try Again. You need to select a faculty for subscribing to a course."
            res.render('home', responseData)
        })
})

app.post('/unsubscribe', (req, res) => {
    // validate the request body
    validateRequest(req.body, 'courseDetails')
        .then((result) => {
            // check if course code does not exist in courses
            if (!(result.courseCode in course_details)) {
                var responseData = { 'message': "Course Code doesn't exist in the Database." }
                res.render('landing', responseData)
            } else {
                // check if user is admin
                if (user_details[sessions[result.auth_token]]['designation'] == 1) {
                    var responseData = { 'message': "Oops! How did you land here? Your designation doesn't support this feature." }
                    res.render('landing', responseData)
                } else {
                    // check if course has started
                    if (new Date() > course_details[result.courseCode]['startDate']) {
                        var message = "Sorry! You're too late. The course is already in progress."
                    } else {
                        for (var professor in registrations[result.courseCode]) {
                            if (registrations[result.courseCode][professor].indexOf(sessions[result.auth_token]) != -1) {
                                break
                            }
                        }

                        // if only student in course under a professor
                        if (registrations[result.courseCode][professor].length == 1) {
                            // removing course and student from registrations
                            delete registrations[result.courseCode][professor]
                        } else {
                            // removing student
                            registrations[result.courseCode][professor].splice(registrations[result.courseCode][professor].indexOf(sessions[result.auth_token]), 1)
                        }
                        var message = "Successfully un-subscribed from the course."
                    }
                    var responseData = homeRenderData(sessions[result.auth_token])
                    responseData['auth_token'] = result.auth_token
                    responseData['message'] = message
                    res.render('home', responseData)
                }
            }
        })
        .catch(() => {
            var responseData = { 'message': "Oops! Something went wrong. Please Try Again." }
            res.render('landing', responseData)
        })
})

app.get('/', (req, res) => {
    res.render('landing')
})

app.get('*', (req, res) => {
    res.redirect('/')
})

app.post('*', (req, res) => {
    res.status(404).send({message: "Requested URL not found."})
})

app.listen(portNumber)
console.log("Server listening on port", portNumber)
