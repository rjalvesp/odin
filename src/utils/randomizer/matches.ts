import R from "ramda";
import faker from "faker";
const touchTypes = ["LEFT_FOOT", "RIGHT_FOOT", "HEAD"];
const originTypes = [
  "PLAY",
  "PASS",
  "CORNER",
  "FREE_KICK",
  "PENALTY_KICK",
  "THROW_IN",
  "GOAL_KICK",
];
const recoveryTypes = ["INTERCEPTION", "DUEL", "TACKLE"];
const cards = [null, "YELLOW", "RED"];

const simulatePass = (
  player: any,
  teammate: any,
  minute: number,
  x: number,
  y: number,
) => {
  const passTypes = ["GROUND", "AIR", "CROSS", "THROUGH", "LOB"];
  const is_assist = Math.random() > 0.9;
  const is_key = is_assist || Math.random() > 0.9;

  return {
    player: player.uuid,
    teammate: teammate.uuid,
    minute: minute.toString(),
    x: x,
    y: y,
    touch: faker.random.arrayElement(touchTypes),
    type: faker.random.arrayElement(passTypes),
    origin: faker.random.arrayElement(originTypes),
    distance: faker.datatype.number(80), // Assuming distance is in meters and within a football field's length
    is_assist, // 10% chance of being an assist
    is_key, // 10% chance of being a key pass
    is_chance_created: is_key || Math.random() > 0.9, // 10% chance of creating a chance
    is_completed: is_assist || is_key || Math.random() > 0.5, // 50% chance of completion
  };
};

const simulateMatchPasses = (match: any) => {
  const { uuid, team1, team2 } = match;
  const matchLength = 90; // Match length in minutes
  const passesPerMinute = 4; // Average number of passes per minute
  const passLog = [];
  let teamPassing = team1;

  for (let minute = 0; minute < matchLength; minute++) {
    for (let pass = 0; pass < passesPerMinute; pass++) {
      // Randomly decide which team makes the pass
      const teamRecovering = teamPassing === team1 ? team2 : team1;

      // Randomly select a player and teammate from the team
      const player = faker.random.arrayElement(teamPassing.players);
      const teammate = faker.random.arrayElement(teamPassing.players);
      const x = faker.datatype.number(125);
      const y = faker.datatype.number(85);

      const pass = simulatePass(player, teammate, minute, x, y);
      passLog.push({
        match: uuid,
        ...pass,
      });

      // If the pass is not completed, the ball is recovered by another player from the opposite team
      if (!pass.is_completed) {
        teamPassing = teamPassing === team1 ? team2 : team1;
      }
    }
  }

  return passLog;
};

const simulateShot = (player: any, minute: number, x: number, y: number) => {
  const is_on_target = Math.random() > 0.5; // 50% chance of being on target

  return {
    player: player.uuid,
    minute: minute.toString(),
    touch: faker.random.arrayElement(touchTypes),
    origin: faker.random.arrayElement(originTypes),
    x: x,
    y: y,
    distance: faker.datatype.number(35), // Assuming distance is in meters and within a football field's length
    is_on_target,
    is_goal: is_on_target && Math.random() > 0.1, // 10% chance of being a goal
  };
};

const generateFibonacci = (limit: number) => {
  const fib = [0, 1];
  while (fib[fib.length - 1] + fib[fib.length - 2] <= limit) {
    fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
  }
  return fib;
};

const simulateMatchShots = (match: any) => {
  const matchLength = 90; // Match length in minutes
  const shotLog = [];
  const fibMinutes = generateFibonacci(13); // Generate Fibonacci sequence up to 21
  const { uuid, team1, team2 } = match;
  for (let minute = 0; minute < matchLength; minute++) {
    // Check if this minute is in the Fibonacci sequence
    if (fibMinutes.includes(minute)) {
      // Randomly decide which team makes the shot
      const team = Math.random() > 0.5 ? team1 : team2;

      // Randomly select a player from the team
      const player = faker.random.arrayElement(team.players);

      // Randomly decide the positions of the shot
      const x = faker.datatype.number(125);
      const y = faker.datatype.number(85);

      const shot = simulateShot(player, minute, x, y);
      shotLog.push({
        match: uuid,
        ...shot,
      });
    }
  }

  return shotLog;
};

const simulateRecovery = (
  player: any,
  opponent: any,
  minute: number,
  x: number,
  y: number,
) => {
  return {
    player: player.uuid,
    opponent: opponent.uuid,
    minute: minute.toString(),
    touch: faker.random.arrayElement(touchTypes),
    recovery: faker.random.arrayElement(recoveryTypes),
    x,
    y,
  };
};

const simulateMatchRecoveries = (match: any) => {
  const { uuid, team1, team2 } = match;
  const matchLength = 90; // Match length in minutes
  const recoveryMinutes = [1, 2, 3]; // Recovery could happen every x minutes
  const recoveryLog = [];

  for (let minute = 0; minute < matchLength; minute++) {
    // Check if this minute is a chance for a recovery
    if (recoveryMinutes.includes(minute % matchLength)) {
      // Randomly decide which team makes the recovery
      const recoveringTeam = Math.random() > 0.5 ? team1 : team2;
      const opponentTeam = recoveringTeam === team1 ? team2 : team1;

      // Randomly select a player from the recovering team and the opponent team
      const player = faker.random.arrayElement(recoveringTeam.players);

      const opponent = faker.random.arrayElement(opponentTeam.players);

      // Randomly decide the positions of the recovery
      const x = faker.datatype.number(125); // Assuming x and y are positions on the field in meters
      const y = faker.datatype.number(85);

      const recovery = simulateRecovery(player, opponent, minute, x, y);
      recoveryLog.push({
        match: uuid,
        ...recovery,
      });
    }
  }

  return recoveryLog;
};

const simulateFoul = (
  player: any,
  opponent: any,
  minute: number,
  x: number,
  y: number,
) => {
  return {
    player: player.uuid,
    opponent: opponent.uuid,
    minute: minute.toString(),
    x: x,
    y: y,
    sanction: faker.random.arrayElement(cards),
  };
};

const simulateMatchFouls = (match: any) => {
  const { uuid, team1, team2 } = match;
  const matchLength = 90; // Match length in minutes
  const foulLog = [];

  for (let minute = 0; minute < matchLength; minute++) {
    // Check if this minute is a chance for a foul
    if (minute % 4 === 0 || minute % 20 === 0) {
      // Randomly decide which team makes the foul
      const foulingTeam = Math.random() > 0.5 ? team1 : team2;
      const opponentTeam = foulingTeam === team1 ? team2 : team1;

      // Randomly select a player from the fouling team and the opponent team
      const player = faker.random.arrayElement(foulingTeam.players);

      const opponent = faker.random.arrayElement(opponentTeam.players);

      // Randomly decide the positions of the foul
      const x = faker.datatype.number(125); // Assuming x and y are positions on the field in meters
      const y = faker.datatype.number(85);

      const foul = simulateFoul(player, opponent, minute, x, y);
      foulLog.push({
        match: uuid,
        ...foul,
      });
    }
  }

  return foulLog;
};

const simulateSubstitution = (player: any, teammate: any, minute: number) => {
  return {
    player: player.uuid,
    teammate: teammate.uuid,
    minute: minute.toString(),
  };
};

const getRandomUniqueSet = (count: number, min: number, max: number) => {
  const set = new Set();

  while (set.size < count) {
    set.add(min + Math.floor(Math.random() * (max - min)));
  }

  return set;
};

const simulateMatchSubstitutions = (match: any) => {
  const { uuid, team1, team2 } = match;
  const substitutionLog: any = [];

  [team1, team2].forEach((team) => {
    const substitutionWindows = getRandomUniqueSet(3, 1, 90); // 3 unique minutes between 1 and 90
    const substitutionMinutes = Array.from(substitutionWindows).sort();

    for (let i = 0; i < substitutionMinutes.length; i++) {
      const minute = substitutionMinutes[i];
      const subCount = i === substitutionMinutes.length - 1 ? 2 : 1; // Two subs in the last window

      for (let j = 0; j < subCount; j++) {
        const player = faker.random.arrayElement(team.players);
        const teammate = faker.random.arrayElement(team.bench);

        // Replace the player with a new one (the substitute)
        const substitution = simulateSubstitution(
          player,
          teammate,
          minute as number,
        );
        substitutionLog.push({ match: uuid, ...substitution });
      }
    }
  });

  return substitutionLog;
};

const simulateDribble = (player: any, opponent: any, minute: number) => {
  return {
    player: player.uuid,
    opponent: opponent.uuid,
    minute: minute.toString(),
    x: faker.datatype.number(125),
    y: faker.datatype.number(85),
  };
};

const simulateMatchDribbles = (match: any) => {
  const { uuid, team1, team2 } = match;

  const dribbleLog = [];
  let minute = 1;

  while (minute <= 90) {
    // A dribble can happen between 1 and 5 minutes
    minute += faker.datatype.number(5) + 1;

    if (minute > 90) break;

    // Get a random player from one team and an opponent from the other
    const team = Math.random() < 0.5 ? team1 : team2;
    const opponentTeam = team === team1 ? team2 : team1;

    const player = faker.random.arrayElement(team.players);
    const opponent = faker.random.arrayElement(opponentTeam.players);

    const dribble = simulateDribble(player, opponent, minute);
    dribbleLog.push({
      match: uuid,
      ...dribble,
    });
  }

  return dribbleLog;
};

const simulateDistance = (
  player: any,
  minute: number,
  meters: number,
  heatmap: number[][],
) => {
  return {
    player: player.uuid,
    minute: minute.toString(),
    meters: meters,
    heatmap: heatmap,
  };
};

const generateHeatMap = () => {
  const heatmap = [];
  for (let i = 0; i < 10; i++) {
    const row = [];
    for (let j = 0; j < 10; j++) {
      row.push(faker.datatype.number(10)); // Generate random values for heatmap
    }
    heatmap.push(row);
  }
  return heatmap;
};

const simulateMatchDistances = (match: any) => {
  const { uuid, team1, team2 } = match;
  const distanceLog: any = [];
  const totalDistancePerPlayer = faker.datatype.number(5000) + 10000; // Between 10km and 15km
  const distancePerMinute = Math.round(totalDistancePerPlayer / 90);

  for (let minute = 1; minute <= 90; minute++) {
    team1.players.concat(team2.players).forEach((player: any) => {
      const distance = simulateDistance(
        player,
        minute,
        distancePerMinute,
        generateHeatMap(),
      );
      distanceLog.push({
        match: uuid,
        ...distance,
      });
    });
  }

  return distanceLog;
};

const simulateSprint = (
  player: any,
  minute: number,
  meters: number,
  duration: number,
  heatmap: number[][],
) => {
  return {
    player: player.uuid,
    minute: minute.toString().padStart(2, "0") + ":00",
    meters: meters,
    duration: duration,
    heatmap: heatmap,
  };
};

const simulateMatchSprints = (match: any) => {
  const { uuid, team1, team2 } = match;
  const sprintLog = [];
  let minute = 1;

  while (minute <= 90) {
    // Sprint can happen between 5 and 10 minutes
    minute += faker.datatype.number(6) + 5;

    if (minute > 90) break;

    // Get a random player from one team
    const team = Math.random() < 0.5 ? team1 : team2;
    const player = faker.random.arrayElement(team.players);

    // Sprint between 20 and 80 meters, for a duration of 5 to 30 seconds
    const meters = faker.datatype.number(61) + 20;
    const duration = faker.datatype.number(26) + 5;

    const sprint = simulateSprint(
      player,
      minute,
      meters,
      duration,
      generateHeatMap(),
    );
    sprintLog.push({ match: uuid, ...sprint });
  }

  return sprintLog;
};

const simulateSave = (player: any, minute: number, type: string) => {
  return {
    player: player.uuid,
    minute: minute.toString(),
    type: type,
  };
};

const simulateMatchSaves = (match: any, shotLogs: any[]) => {
  const { uuid, team1, team2 } = match;
  const saveLog: any = [];
  const goalkeepers = [team1.players[0], team2.players[0]]; // Assuming that first player in each team is goalkeeper

  // Save happens 1 to 3 minutes after a shot
  shotLogs.forEach((shotLog) => {
    const minuteShot = shotLog.minute;
    const minuteSave = minuteShot + faker.datatype.number(3) + 1;

    if (minuteSave > 90) return;

    // Selects the goalkeeper of the team who didn't shoot
    const player =
      shotLog.player === team1.players[0].uuid
        ? goalkeepers[1]
        : goalkeepers[0];

    // Save types: 'CAUGHT', 'PUNCHED', 'PARRIED', 'TIPPED'
    const type = faker.random.arrayElement([
      "CAUGHT",
      "PUNCHED",
      "PARRIED",
      "TIPPED",
    ]);

    const save = simulateSave(player, minuteSave, type);
    saveLog.push({
      match: uuid,
      ...save,
    });
  });

  return saveLog;
};

const cleanPlayers = R.pipe(
  R.values,
  R.filter(R.has("value")),
  R.map(({ value, others }: any) => ({ ...value, ...others })),
);

const pickPlayersAndBench = (allPlayers: any[]) => {
  const positions = R.pipe(R.groupBy(R.prop("position")))(allPlayers);
  const players: any = [
    ...faker.random.arrayElements(positions.Goalkeeper, 1),
    ...faker.random.arrayElements(positions.Defender, 4),
    ...faker.random.arrayElements(positions.Midfielder, 4),
    ...faker.random.arrayElements(positions.Forward, 2),
  ];
  const bench = R.pipe(
    R.indexBy(R.prop("uuid")),
    R.omit(R.pluck("uuid", players)),
    R.values,
  )(allPlayers);
  return {
    players,
    bench,
  };
};

export const generateMatchLogs = (
  season: string,
  league: string,
  matches: any,
) => {
  const parsedMatches = R.pipe(
    R.path([league, season]),
    R.values,
    R.flatten,
    R.map(
      R.pipe(
        R.over(R.lensPath(["team1", "players"]), cleanPlayers),
        R.over(R.lensPath(["team1"]), (value: any) => ({
          ...value,
          ...pickPlayersAndBench(value.players),
        })),
        R.over(R.lensPath(["team2", "players"]), cleanPlayers),
        R.over(R.lensPath(["team2"]), (value: any) => ({
          ...value,
          ...pickPlayersAndBench(value.players),
        })),
      ),
    ),
  )(matches);

  return parsedMatches.map((match: any) => {
    const value = simulateMatchShots(match);
    return [
      { type: "distances", value: simulateMatchDistances(match) },
      { type: "dribbles", value: simulateMatchDribbles(match) },
      { type: "fouls", value: simulateMatchFouls(match) },
      { type: "passes", value: simulateMatchPasses(match) },
      { type: "recoveries", value: simulateMatchRecoveries(match) },
      { type: "saves", value: simulateMatchSaves(match, value) },
      { type: "shots", value },
      { type: "sprints", value: simulateMatchSprints(match) },
      { type: "substitutions", value: simulateMatchSubstitutions(match) },
    ];
  });
};
