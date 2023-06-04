
## Introduction

Current repository is an empty Node Express app built with Typescript. 

## Requirements

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node 18.13.0 from any of the following:
    - [Node official website](https://nodejs.org/dist/v18.13.0/)
    - NVM (if you know what you are doing)

##### Optional
- [VSCode](https://code.visualstudio.com/download) and extensions:
    - ESLint
    - Prettier
    - Git history / Git Lens
    - Todo Tree

## Setup
1. Install yarn via `npm install -g yarn`
2. Install packages using package's manager command `yarn install` or simply `yarn`
3. Create a new `.env` file using `.env.example` as a template. You might want to use the following command `cp .env.example .env` for local development
3.1. Fill the empty values in the newly created `.env` file. By default the values `NODE_ENV` will be empty, and `NODE_PORT` will be `3000`, also you'll find the environment variables necessary for starting connecting to other services like the database. Any one of those starting with `COUCHDB_*` are related to the database setup.


## Local development

- Start the docker-compose configuration running `docker-compose up`, when you are done working you can shut it down using `docker-compose down`.
- Execute `yarn start:dev`.

### Running tests manually

Execute `yarn test` to check that all tests passes, if you want to check how compliant your code is with the coverage rules, run `yarn coverage`.

### Considerations

- The project locally runs with `nodemon`, a deamon that is watching for file changes to rerun the service from start.
- In order to keep the code tidy, project counts with some validations before adding new code to the repository, to achieve this we count with husky hooks, currently the application have two hooks
    - Pre-commit: Occurs before commiting a change, currently checks for:
        - [Linting](https://eslint.org/)
        - Commit messages to be written in the form of a [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/).
    - Pre-push: Occurs before pushing changes to remote, currently check for the unit test coverage to be in order. The unit testing framework currently used is [Jest](https://jestjs.io/)

## Making changes

- To make a change, change should be described in the [Github Issues page](https://github.com/rjalvesp/lapa-server/issues)
- The change to make should be worked on a new branch locally with the name of `${feature|hotfix|fix|chore|docs|ci|refactor}/${issue-number}` and then pushed to it's remote branch
- A pull request should be created for that branch, description's template compliant, linked manually to the issue, and have at least one reviewer.
- No change should be merged without approval.
