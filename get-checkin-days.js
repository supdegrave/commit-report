// ============================
// get-checkin-days.js
// ============================
// Examines Mercurial history for a given month / user combination, and determines the total number of days containing checkins. 

const util = require('util');
const exec$ = util.promisify(require('child_process').exec);

const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = new Date();
const lastMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
const lastMonthShortName = shortMonthNames[lastMonthLastDay.getMonth()];

// parse command-line arguments
const arguments = require('minimist')(process.argv.slice(2));
const projects = parseProjects(arguments);

const args = [
    'hg',
    'log',
    '--user',
    arguments.user,
    '--date',
    `'${lastMonthShortName} ${lastMonthLastDay.getFullYear()}'`,
    '--no-merges'
];

let changeSets = [];
let reportText = [];
let reportSubject = '';

function main() {
    const projectCommitsArray$ = projects.map(getProjectCommits);

    Promise.all(projectCommitsArray$)
        .then(projectCommits$ => {
            projectCommits$.forEach(projectCommits => {
                const { project, commits } = projectCommits;
                const projectChangeSets = commits
                    .map(commit => new ChangeSet(project, commit))
                    .filter(cs => !!cs.changeset);

                changeSets = changeSets.concat(projectChangeSets);
            });
        })
        .then(() => {
            generateCommitReport();
            console.log(reportText.join(''));
            // TODO: send email if required arguments are passed
        })
        .catch(console.error);
}

async function getProjectCommits(project) {
    const cmd = args.join(' ');
    const options = { cwd: project.path };

    try {
        return await exec$(cmd, options)
            .then(response => {
                const commits = response.stdout.toString().trim().split(/\n\n/);
                return { project, commits };
            })
    } catch (err) {
        console.error(`error: $err`);
    }
}

function parseProjects(arguments) {
    let projects = [];

    if (arguments.project) {
        if (!(arguments.project instanceof Array)) {
            console.log(arguments.project);
            arguments.project = [arguments.project];
            console.log(arguments.project);
        }
        projects = arguments.project.map(p => {
            const projectParts = p.split(':');
            return {
                name: projectParts[0],
                path: projectParts[1]
            };
        });
    }

    return projects;
}

function generateCommitReport() {
    const dateSortedChangeSets = changeSets
        .sort((cs1, cs2) => cs1.date - cs2.date);

    const datesWithChangeSets = dateSortedChangeSets
        .map(cs => cs.dayOfMonth)
        .filter((val, inx, arr) => arr.indexOf(val) === inx);

    const changeSetsByDate = datesWithChangeSets
        .map(date => {
            const changeSets = dateSortedChangeSets.filter(cs => cs.dayOfMonth === date);
            return { date, changeSets };
        });

    reportSubject = `${lastMonthShortName} ${lastMonthLastDay.getFullYear()}: ${datesWithChangeSets.length} days with commits`;

    addReportText(`==========================================`);
    addReportText(reportSubject);
    addReportText(`==========================================`);
    addReportText(``);

    changeSetsByDate.forEach(csbd => {
        const groupedChangeSets = csbd.changeSets.mapBy(cs => cs.projectName);

        addReportText(`${lastMonthShortName} ${csbd.date}: ${csbd.changeSets.length} commit(s)`);
        addReportText(`-------------------------------------------`);
            projects.forEach(project => {
                const projectChangeSets = groupedChangeSets.get(project.name);

                if (projectChangeSets instanceof Array) {
                    addReportText(`project: ${project.name}`);
                    projectChangeSets.forEach(cs => addReportText(`- ${cs.summary} (${cs.changeset.split(':')[1]})`));
                    addReportText(`-------------------------------------------`);
                }
            });
        addReportText(``);
    });
}

function addReportText(string) {
    reportText.push(`${string} \n`);
}

main();


// ##### supporting classes ##################################

class ChangeSet {
    constructor(project, commitText) {
        const re = /changeset\:\s+([^$]+)$\n^user\:\s+([^$]+)$\n^date\:\s+([^$]+)$\n^summary\:\s+([^$]+)/m;
        const matches = commitText.match(re);

        if (matches) {
            this.projectName = project.name;
            this.changeset = matches[1];
            this.date = new Date(matches[3]);
            this.summary = matches[4];

            this.dayOfMonth = this.date.getDate();
        }
    }
}

Array.prototype.mapBy = function (keyGetter) {
    const list = this;
    const map = new Map();

    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);

        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });

    return map;
};
