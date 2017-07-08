var express = require('express');
var app = express();
var validUrl = require('valid-url');

var MongoClient = require('mongodb').MongoClient;
var db_url = 'mongodb://admin:password@ds121222.mlab.com:21222/fcc-backend';
var prefix_url = 'https://glen-almanac.glitch.me/';


MongoClient.connect(db_url, (err, db) => {
  if (err) return console.log('Error connecting to database');

  var urls = db.collection('urls');
  
  app.use(express.static('public'));

  app.get("/", function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
  });

  app.get('/new/*' ,function(req,res) {
    
    // Check to see if the parameter is a valid URL
    if (validUrl.isUri(req.params[0])) {
      
      var original_url = req.params[0];
    
      // Check if the submitted original_url URL is already in collection 

      urls.find({'original_url': original_url}).toArray(function(err, docs) {
        if (err) console.log('error finding url');
        else {

          // If it is not in the collection, 
          if (docs.length < 1) {

          // ...create a new URL
            // Create an ID. To create an integer ID, 
            // first check to see if there are any records in the db. 
            urls.find({_id: { $ne:null }}).toArray(function(err, docs) {
              if (err) console.log('error obtaining non-null ids');
              else {
                if (docs.length < 1) {  // If there are no records in the db, create a record with id = 0

                  var url_id = 0;
                  var short_url = prefix_url + url_id.toString();
                  urls.insert({'original_url':original_url, 'short_url': short_url, 'url_id': url_id});

                } else {    // If there are already records in the db, find the largest ID in the database, and then add 1. 

                  urls.aggregate([
                    { $group: {
                      _id: 'max' // This can be an arbitrary string in this case
                      , max: {
                        $max: '$url_id'
                      }
                      }}
                    ]).toArray(function(err, results) {
                      var max_id = results[0].max;
                      var url_id = max_id + 1;
                      var short_url = prefix_url + url_id.toString();
                      urls.insert({'original_url':original_url, 'short_url': short_url, 'url_id': url_id});
                    });
                } 
              }
            });

            // For any new URLs, once data has been stored, return the URLs to the page
            res.send({'original_url':original_url, 'short_url':short_url});

          } else {
            // If it is, assign existing URLs to original_url and short_url

            var short_url = docs[0].short_url;

            // For any old URLs, once data has been fetched, return the URLs to the page
            res.send({'original_url':original_url, 'short_url':short_url});

          }
        }
      });
      
    } else {   // URL is invalid, redirect to error message homescreen
      res.sendFile(__dirname + '/views/index_error.html');
    }
    
  });
  
  // Handle short URLs and redirect
  app.get("/:url_id", function (req, res) {
    var url_id = parseInt(req.params.url_id);
    
    // Get the original URL with the corresponding short URL
    urls.find({'url_id': url_id}).toArray(function(err, docs) {
      if (err) {
        res.sendFile(__dirname + '/views/index_error.html');
      } else {
        res.redirect(docs[0].original_url);
      } 
    });
    
  });

  var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
  });
  
}) // end Mongo connection

