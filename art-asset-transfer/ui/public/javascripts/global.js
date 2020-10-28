// Userlist data array for filling in info box
var userListData = [];

// DOM Ready =============================================================
$(document).ready(function() {
  console.log("data");
  // Populate the user table on initial page load
  populateTable();

});

// Functions =============================================================

// Fill table with data
function populateTable() {

  // Empty content string
  var tableContent = '';

  // jQuery AJAX call for JSON
  $.getJSON( '/users/userlist', function( data ) {
    
    // For each item in our JSON, add a table row and cells to the content string
    $.each(data, function(){
      tableContent += '<tr>';
      tableContent += '<td>' + this.Record.ID + '</td>';
      tableContent += '<td>' + this.color + '</td>';
      tableContent += '<td>' + this.size + '</td>';
      tableContent += '<td>' + this.owner + '</td>';
      tableContent += '<td>' + this.appraisedValue + '</td>';
      tableContent += '<td><a href="#" class="linkdeleteuser" rel="' + this._id + '">update</a></td>';
      tableContent += '</tr>';
    });

    // Inject the whole content string into our existing HTML table
    $('#userList table tbody').html(tableContent);
  });
};