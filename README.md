# Learning-Management-System
### PayPal VAP 2020 Mini-Project 1
A system developed using `Node.Js` and `Pug` for universities to facilitate management of courses. The system supports `admin`, `faculty` and `student` user types. It supports API requests via `no-gui` interface. 

## How to Run

* Clone this GitHub repo to 'dir'
* Navigate to 'dir'
* Run `npm install` to install the dependencies
* Run `nodemon .\server.js` or `node .\server.js` to start a server instance of the project

## Features

* Proper validations are performed and the responses include well defined messages.
* The system supports sessions to keep track of users and services. When a session is started, `auth_token` is generated by the server which needs to be passed in every request to provide authentication.

### Three types of users: 
#### Admin (designation = 2)
The `home` page for admin
* provides facility to `create` and `delete` **student**, **faculty** accounts. 
Inputs required to create a new user: `username`, `name`, `password`, `designation`
Inputs required to delete user: `username`
* lists all courses (code, description, start date, duration in months, registrations under each faculty) 

#### Faculty (designation = 1)
The `home` page for faculty
* provides facility to `create` a new course
  Inputs required: `courseCode`, `courseName`, `startingDate`, `duration`. If the faculty tries to create a course with existing courseCode, the faculty will be added to the list of instructors for that course.
 * lists **'My courses'** - courses for which the faculty is a registered instructor
 * lists **'All courses'** - all courses offered by the university

Selecting a course and clicking **'Get Details'** button will trigger navigation to `course` page for that course.
The `course` page for faculty
*	lists course description, faculties taking the course, start date, status (has commenced?...), number of registrations, table of registrations (faculty: [students..])
*	provides facility to `delete` course if the faculty is a registered faculty for the course
	If this is the only registered faculty - the course record is deleted along with all registrations.
	Else - faculty is removed from the list of registered faculties along with all registrations under the faculty
* provides facility to `participate` in the course (i.e. join the registered faculty list) if the faculty is not a registered faculty for the course

#### Student (designation = 0)
The `home` page for student
 * lists **'My courses'** - courses to which the student has subscribed
 * lists **'All courses'** - all courses offered by the university

Selecting a course and clicking **'Get Details'** button will trigger navigation to `course` page for that course.
The `course` page for student
* lists course description, faculties taking the course, start date, status (has commenced?...), number of registrations, table of registrations (faculty: [students..], faculty under whom the student is registered)
* provides facility to `subscribe` to the course if the student is not already subscribed under any faculty AND the course has not commenced
Input required: `faculty` under which the student wishes to register
* provides facility to `unsubscribe` from the course if the student is already subscribed


