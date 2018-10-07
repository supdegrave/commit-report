# commit-report

Node.js script which generates a report of Mercurial activity for the prior month. 

## BUGS


## TODO 

* update hgOnClose to only generate reports / send email once all projects have been queried
* add instructions in README for sending email
* Move ChangeSet class into separate file
* set up bash script to run cron job; see the following: https://medium.com/@gattermeier/cronjobs-for-your-node-js-apps-on-macos-20d129b42c0e
* update to run for current month (default to previous month)
* include day of week short name in daily report details
* include project name for each changeset
* sort daily changesets by commit time (add to ChangeSet)

## DONE

* pass arguments into node script, parse with https://www.npmjs.com/package/minimist
* extract username into bash script
* extract gmail PII into bash script
* extract projects into bash script
* If only a single project is passed, wrap in array
* replace `path` with `projects`, an array of objects: { name, path }, update main to forEach over projects, initializing hgLog and assigning event handlers for each project
* init repo and add to github