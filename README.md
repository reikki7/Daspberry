# Daspberry

Daspberry is my very personal dashboard application. It provides a seamless user experience with various integrated tools and functionalities, including a calendar, game progress tracker, photo and video works management, task management, and projects tracking.

Feel free to customize this project further to fit your specific needs. You can add more screens, change the sections, or include additional features as needed.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Build](#build)
- [Features](#features)
- [License](#license)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)

## Installation

To install Daspberry, follow these steps:

Clone the repository:

```sh
git clone https://github.com/reikki7/Dashberry.git
cd Dashberry
```

Install the dependencies:

```sh
pnpm install
```

## Development

To start the development server, run:

```sh
pnpm tauri dev
```

This will start the Tauri development server and open the application in a new window.

## Build

To build the project for production, run:

```sh
pnpm tauri build
```

This will create a production build of the application.

## Features

- **Music Player**: Play music from your local files with features like shuffle, repeat, and volume control. The player also displays album art and metadata for the current track.
- **Local & Github Repo Viewer**: View and manage your local and GitHub repositories. The viewer fetches project folders from your local system and repositories from your GitHub account, displaying relevant information such as the framework used and the last modified date.
- **Events**: View and manage your events.
- **Weather**: Check the weather in your area.
- **Tasks**: Keep track of your tasks and deadlines.
- **Game Progress Tracker**: Track your progress in your games.
- **Settings**: Customize the application to your liking.

## License

This project uses the following license: [MIT](LICENSE).
