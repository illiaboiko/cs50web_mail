document.addEventListener('DOMContentLoaded', function () {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);


  // add event listener to the Send Email button
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
};

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#single-email-view').innerHTML = '';

  // set initial state of the app
  history.replaceState({ mailbox: mailbox, email_id: null }, "", "/")

  // get mailbox view parent div
  const mailContainer = document.querySelector('#emails-view');

  // Show the mailbox name
  mailContainer.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;


  // get the data from API

  fetch(`emails/${mailbox}`)
    .then((response) => {
      // check response from the API
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error);
        });
      } else {
        console.log(response.status)
        return response.json();
      }
    })
    .then(data => {
      // create table element and make header
      document.querySelector('#emails-view').insertAdjacentHTML('beforeend', `
        <table id="inboxTable" class="table table-bordered table-hover">
              <thead>
                  <tr>
                      <th scope="col">From</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Received</th>
                      <th scope="col"></th>
                  </tr>
              </thead>
              <tbody>
              </tbody>
          </table>
      `)
      const tableBody = document.querySelector('#inboxTable tbody');

      // loop through every email and render table rows and cells
      data.forEach(email => {
        // get email id
        const id = email.id

        // create table row
        const tableRow = document.createElement('tr');
        //create row cells, populate with data and append to a row
        const tableCellFrom = document.createElement('td');
        tableCellFrom.innerHTML = email.sender;

        const tableCellSubject = document.createElement('td');
        tableCellSubject.innerHTML = email.subject;

        const tableCellTimestamp = document.createElement('td');
        tableCellTimestamp.innerHTML = email.timestamp;

        tableRow.append(tableCellFrom, tableCellSubject, tableCellTimestamp);

        // add archive button only in the inbox
        if (mailbox != 'sent') {
          const tableCellArchive = document.createElement('td');
          const archiveButton = document.createElement('button');
          archiveButton.classList.add('btn', 'btn-light');
          archiveButton.setAttribute('type', 'button');
          archiveButton.setAttribute('data-email_id', `${id}`);
          archiveButton.innerText = mailbox === 'inbox' ? 'Archive': 'Unarchive';

          tableCellArchive.append(archiveButton);

          // append button 
          tableRow.append(tableCellArchive);
          // assign an action for the archive function. true to archive, false to unarchive
          const archived = mailbox === 'inbox' ? true: false;
          // assign event listener for archive action
          archiveButton.addEventListener('click', (event) => archive(event, id, archived));
        }
 

        // add click eventLIstener to be able to show particular email
        tableRow.addEventListener('click', () => show_email(id));

        // check whether email is read and change background
        if (!email.read) {
          tableRow.classList.add('table-secondary');
        } else {
          tableRow.classList.remove('table-secondary');
        }

        // append the row to a tableBody
        tableBody.appendChild(tableRow)

      });
    })


};

function show_email(id) {

  // hide email and compose view (single email view is shown at the end of the procedure)
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#single-email-view').style.display = 'none';

  // set single-email-view container
  const emailContainer = document.querySelector('#single-email-view')


  // make GET request to fetch the date from email API
  fetch(`/emails/${id}`)
    .then((response) => {
      if (!response.ok) {
        emailContainer.text = "Couldn't not load the email :(";
        return response.json().then((errorData) => {
          throw new Error(errorData.error)
        });
      } else {
        console.log(response.status);
        return response.json();
      }
    })
    .then((email) => {
      // clear email view
      emailContainer.innerHTML = '';

      // render the email view
      const infoDiv = document.createElement('div');
      infoDiv.insertAdjacentHTML('beforeend', `
      <p class="mb-1"><span class="font-weight-bolder">From: </span>${email.sender}</p>
      <p class="mb-1"><span class="font-weight-bolder">To: </span>${email.recipients.toString()}</p>
      <p class="mb-1"><span class="font-weight-bolder">Subject: </span>${email.subject}</p>
      <p class="mb-1"><span class="font-weight-bolder">Timestamp: </span>${email.timestamp}</p>
      <br>
    `);

      const bodyDiv = document.createElement('div');
      bodyDiv.insertAdjacentHTML('beforeend', `
      <p>${email.body}</p>
    `);

      emailContainer.append(infoDiv, bodyDiv);


      // Add the current state to the history
      history.pushState({ email_id: id }, "", `emails/${id}`);

      // mark email as read using API
      fetch(`/emails/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          read: true
        })
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((errorData) => {
              throw new Error(errorData.error)
            });
          } else {
            console.log(response.status);
          }
        })
    })
    .catch(error => {
      console.log('error', error.message)
    });

  // show single emeail view

  document.querySelector('#single-email-view').style.display = 'block';
}


function send_email(event) {

  // get form data:
  const recipientsData = document.querySelector('#compose-recipients').value.toLowerCase();
  const subjectData = document.querySelector('#compose-subject').value;
  const bodyData = document.querySelector('#compose-body').value;


  // send POST request to the API:
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipientsData,
      subject: subjectData,
      body: bodyData,
    })
  })
    .then((response) => {
      // check response from the API
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.error)
        });
      } else {
        return response.json();
      }
    })
    .then(result => {
      // Print result
      console.log(result);
      // load user's sent mailbox
      load_mailbox('sent');
    })
    .catch(error => {
      console.log('error', error.message);
      load_mailbox('inbox');
    });
  // prevent default submission
  event.preventDefault();

};

// When back arrow is clicked, show previous section
window.addEventListener("popstate", function (event) {
  if (event.state["mailbox"]) {
    load_mailbox(event.state.mailbox);
  } else {
    show_email(event.state.email_id);
  }
});

// archive funtion
function archive(event, id, archived) {
  event.stopPropagation()

  // mark email as read using API
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: archived
    })
  })
  .then((response) => {
    if (!response.ok) {
      return response.json().then((errorData) => {
        throw new Error(errorData.error)
      });
    } else {
      console.log(response.status);
      load_mailbox('inbox');
    }
  })
  .catch(error => {
    console.log('error', error.message)
  });
}