import { readdirSync } from "fs";
import path from "path";
import R from "ramda";
import RA from "ramda-adjunct";
import dayjs from "dayjs";
import { v4 } from "uuid";
import faker from "faker";
import csvtojson from "csvtojson";
import { Leagues } from "@definitions/constants/leagues";
import { SoftStats, Stats } from "@definitions/constants/stats";
import { Injuries } from "@definitions/constants/injuries";
import { generateMatchLogs } from "./matches";
import { coreDb as sql } from "@services/database";

let dictionary: any;
let players: any;
let uuidTeams: any;
let dictionaryTeams: any;
let matches: any;
let playersByClub: any = {};

const getSeasonName = R.pipe(
  (value: string) => /\d{4}-to-\d{4}/.exec(value),
  R.head,
  R.replace("-to-", "/"),
);

const getSetName = R.pipe(
  (value: string) => /(matches|players|teams)/.exec(value),
  R.head,
);

const getLeagueName = R.pipe(
  R.split("-matches"),
  R.head,
  R.split("-players"),
  R.head,
  R.split("-teams"),
  R.head,
  R.toUpper,
  R.split("-"),
  R.join("_"),
);

const generateInjuries = (player: any) => {
  const { birth_date, uuid } = player;
  const today = dayjs();
  let acum = dayjs(birth_date).add(17, "years");
  const data = [];
  while (acum.year() < today.year()) {
    const {
      injuryName,
      estimatedRecoveryTime: { months, days },
    } = faker.random.arrayElement(Injuries);
    const current = acum.clone();
    acum = acum.add(1, "year");
    const date = dayjs(
      faker.date.between(`${current.year()}-01-01`, `${acum.year()}-12-31`),
    );
    data.push({
      player: uuid,
      name: injuryName,
      start_date: date.format(),
      end_date: date.add(months, "months").add(days, "days").format(),
    });
  }
  return data;
};

const generateTransfers = (player: any, currentTeam: any) => {
  if (!dictionaryTeams) {
    dictionaryTeams = R.pipe(
      R.values,
      R.map(R.pipe(R.values, R.mergeAll, R.prop("teams"))),
      R.flatten,
      R.pluck("team_name"),
    )(dictionary);
  }
  if (!uuidTeams) {
    uuidTeams = R.pipe(
      R.values,
      R.map(R.pipe(R.values, R.mergeAll)),
      R.mergeAll,
    )(players);
  }
  const { birth_date, uuid } = player;
  const today = dayjs();
  let acum = dayjs(birth_date).add(17, "years");
  const data = [];
  while (acum.year() < today.year() - 3) {
    const years = faker.datatype.number({ min: 1, max: 4 });
    const current = acum.clone();
    acum = acum.add(years, "year");
    data.push({
      player: uuid,
      team_from: currentTeam.uuid,
      team_to: currentTeam.uuid,
      start_date: current.format(),
      end_date: acum.format(),
      transfer_type: faker.random.arrayElement(["LOAN", "BUYOUT"]),
      value: faker.datatype.float({ max: 500000000, min: 0, precision: 2 }),
    });
  }
  data.push({
    player: uuid,
    team_from: R.last(data)?.team_from || currentTeam.uuid,
    team_to: currentTeam.uuid,
    start_date: R.last(data)?.end_date || dayjs().subtract(1, "year").format(),
    end_date: dayjs().add(1, "year").format(),
    transfer_type: faker.random.arrayElement(["LOAN", "BUYOUT"]),
    value: faker.datatype.float({ max: 500000000, min: 0, precision: 2 }),
  });
  return data;
};

const generateSoftTraits = (player: string) => {
  const values = R.values(SoftStats);
  const rounds = R.range(0, faker.datatype.number({ min: 5, max: 10 }));
  return rounds.map(() =>
    faker.random
      .arrayElements(values, faker.datatype.number(values.length - 2))
      .map((field) => ({
        player,
        field,
        date_recorded: faker.date.past(),
      })),
  );
};

const generateStats = (player: string) => {
  const values = R.values(Stats);
  const rounds = R.range(0, faker.datatype.number({ min: 5, max: 10 }));
  return rounds.map(() =>
    values.map((field: string) => ({
      player,
      field,
      value: faker.datatype.number({ min: 1, max: 10 }),
      date_recorded: faker.date.past(),
    })),
  );
};

const getAllFiles = () => {
  const dir = path.resolve(__dirname, "historics");
  const files = R.pipe(readdirSync, R.reject(R.equals(".DS_Store")))(dir);
  const promises = files.map((fileName: string) =>
    csvtojson()
      .fromFile(`${dir}/${fileName}`)
      .then(R.objOf("value"))
      .then(R.assoc("set", getSetName(fileName)))
      .then(R.assoc("season", getSeasonName(fileName)))
      .then(R.assoc("league", getLeagueName(fileName))),
  );
  return Promise.allSettled(promises)
    .then(R.pluck("value"))
    .then(R.groupBy(R.prop("league")))
    .then(
      R.mapObjIndexed(
        R.pipe(
          R.groupBy(R.prop("season")),
          R.mapObjIndexed(
            R.pipe(
              R.groupBy(R.prop("set")),
              R.mapObjIndexed(R.pipe(R.pluck("value"), R.flatten)),
            ),
          ),
        ),
      ),
    )
    .then((value) => (dictionary = value));
};

const generatePlayers = (
  team: { common_name: string; team_name: string },
  season: string,
  league: string,
) => {
  if (!playersByClub?.[league]?.[season]) {
    playersByClub = R.assocPath(
      [league, season],
      R.pipe(
        R.path([league, season, "players"]),
        R.groupBy(R.prop("Current Club")),
      )(dictionary),
      playersByClub,
    );
  }
  const playersByLeagueSeason = playersByClub[league][season];
  const value =
    playersByLeagueSeason[team.team_name] ||
    playersByLeagueSeason[team.common_name];

  return R.pipe(
    R.map(
      R.pipe(
        R.pick(["full_name", "birthday", "position", "nationality"]),
        ({
          full_name,
          birthday,
          nationality,
          position,
        }: {
          [key: string]: string;
        }) => {
          const uuid = v4();
          const value = {
            uuid,
            fullname: full_name,
            name: full_name,
            can_be_elected: [
              nationality
                .toUpperCase()
                .split(" ")
                .join("_")
                .split("-")
                .join("_"),
            ],
            birth_place: nationality
              .toUpperCase()
              .split(" ")
              .join("_")
              .split("-")
              .join("_"),
            birth_date: dayjs((birthday as any) * 1000).format(),
            preferred_foot: faker.random.arrayElement(["LEFT", "RIGHT"]),
            height: faker.datatype.number({ min: 1.6, max: 2.2 }),
            weight: faker.datatype.number({ min: 60, max: 120 }),
          };

          return {
            [full_name]: {
              value,
              others: { position },
              softTraits: generateSoftTraits(uuid),
              stats: generateStats(uuid),
              transfers:
                season.split("/")[1] === "2023"
                  ? generateTransfers(value, team)
                  : null,
              injuries:
                season.split("/")[1] === "2023" ? generateInjuries(value) : [],
            },
            [uuid]: value,
          };
        },
      ),
    ),
    R.mergeAll,
  )(value);
};

const generateTeams = (season: string, league: string) => {
  return R.pipe(
    R.path([league, season, "teams"]),
    R.map(
      R.pipe(
        (team: any) => {
          const uuid = v4();
          return {
            uuid,
            team_name: team.team_name,
            common_name: team.common_name,
            country: team.country
              .toUpperCase()
              .split(" ")
              .join("_")
              .split("-")
              .join("_"),
            players: generatePlayers({ uuid, ...team }, season, league),
          };
        },
        (team: any) => {
          const { players, country, common_name, team_name: name, uuid } = team;
          const value = {
            uuid,
            country,
            name,
          };
          return {
            [common_name]: { value, players },
            [name]: { value, players },
            [uuid]: { value, players },
          };
        },
      ),
    ),
    R.mergeAll,
  )(dictionary);
};

const getTeamByName = (season: string, league: string, team: string) =>
  R.pipe(R.path([league, season, team]))(players);

const generateMatches = (season: string, league: string) => {
  return R.pipe(
    R.path([league, season, "matches"]),
    R.map((match: any) => {
      const matchday = match["Game Week"];
      const { timestamp, stadium_name, home_team_name, away_team_name } = match;
      return {
        uuid: v4(),
        matchday,
        league,
        season,
        scheduled: dayjs(timestamp * 1000).format(),
        place: stadium_name,
        team1: getTeamByName(season, league, home_team_name),
        team2: getTeamByName(season, league, away_team_name),
      };
    }),
    R.groupBy(R.prop("matchday")),
  )(dictionary);
};

const fillPlayers = () => {
  return (players = {
    [Leagues.FRANCE_LIGUE_1]: {
      "2021/2022": generateTeams("2021/2022", Leagues.FRANCE_LIGUE_1),
      "2022/2023": generateTeams("2022/2023", Leagues.FRANCE_LIGUE_1),
    },
    // [Leagues.FRANCE_LIGUE_2]: {
    //   "2021/2022": generateTeams("2021/2022", Leagues.FRANCE_LIGUE_2),
    //   "2022/2023": generateTeams("2022/2023", Leagues.FRANCE_LIGUE_2),
    // },
    // [Leagues.MEXICO_LIGA_MX]: {
    //   "2021/2022": generateTeams("2021/2022", Leagues.MEXICO_LIGA_MX),
    //   "2022/2023": generateTeams("2022/2023", Leagues.MEXICO_LIGA_MX),
    // },
    // [Leagues.MEXICO_ASCENSO_MX]: {
    //   "2021/2022": generateTeams("2021/2022", Leagues.MEXICO_ASCENSO_MX),
    //   "2022/2023": generateTeams("2022/2023", Leagues.MEXICO_ASCENSO_MX),
    // },
    // [Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER]: {
    //   "2022/2022": generateTeams(
    //     "2022/2022",
    //     Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER,
    //   ),
    //   "2023/2023": generateTeams(
    //     "2023/2023",
    //     Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER,
    //   ),
    // },
  });
};

const fillMatches = () => {
  matches = {
    [Leagues.FRANCE_LIGUE_1]: {
      "2021/2022": generateMatches("2021/2022", Leagues.FRANCE_LIGUE_1),
      "2022/2023": generateMatches("2022/2023", Leagues.FRANCE_LIGUE_1),
    },
    // [Leagues.FRANCE_LIGUE_2]: {
    //   "2021/2022": generateMatches("2021/2022", Leagues.FRANCE_LIGUE_2),
    //   "2022/2023": generateMatches("2022/2023", Leagues.FRANCE_LIGUE_2),
    // },
    // [Leagues.MEXICO_LIGA_MX]: {
    //   "2021/2022": generateMatches("2021/2022", Leagues.MEXICO_LIGA_MX),
    //   "2022/2023": generateMatches("2022/2023", Leagues.MEXICO_LIGA_MX),
    // },
    // [Leagues.MEXICO_ASCENSO_MX]: {
    //   "2021/2022": generateMatches("2021/2022", Leagues.MEXICO_ASCENSO_MX),
    //   "2022/2023": generateMatches("2022/2023", Leagues.MEXICO_ASCENSO_MX),
    // },
    // [Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER]: {
    //   "2022/2022": generateMatches(
    //     "2022/2022",
    //     Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER,
    //   ),
    //   "2023/2023": generateMatches(
    //     "2023/2023",
    //     Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER,
    //   ),
    // },
  };
};

const simulate = () => {
  const log: any = [];
  log.push(generateMatchLogs("2021/2022", Leagues.FRANCE_LIGUE_1, matches));
  log.push(generateMatchLogs("2022/2023", Leagues.FRANCE_LIGUE_1, matches));
  // log.push(generateMatchLogs("2021/2022", Leagues.FRANCE_LIGUE_2, matches));
  // log.push(generateMatchLogs("2022/2023", Leagues.FRANCE_LIGUE_2, matches));
  // log.push(generateMatchLogs("2021/2022", Leagues.MEXICO_LIGA_MX, matches));
  // log.push(generateMatchLogs("2022/2023", Leagues.MEXICO_LIGA_MX, matches));
  // log.push(generateMatchLogs("2021/2022", Leagues.MEXICO_ASCENSO_MX, matches));
  // log.push(generateMatchLogs("2022/2023", Leagues.MEXICO_ASCENSO_MX, matches));
  // log.push(
  //   generateMatchLogs(
  //     "2022/2022",
  //     Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER,
  //     matches,
  //   ),
  // );
  // log.push(
  //   generateMatchLogs(
  //     "2023/2023",
  //     Leagues.UNITED_STATES_MAJOR_LEAGUE_SOCCER,
  //     matches,
  //   ),
  // );
  const matchLogs = R.pipe(
    R.values,
    R.map(R.pipe(R.values, R.map(R.values))),
    R.flatten,
    R.indexBy(R.prop("uuid")),
    R.values,
    R.map(
      R.pipe(
        R.over(R.lensProp("team1"), R.path(["value", "uuid"])),
        R.over(R.lensProp("team2"), R.path(["value", "uuid"])),
      ),
    ),
  )(matches);

  const teamLogs = R.pipe(
    R.values,
    R.map(R.map(R.pipe(R.values, R.pluck("value")))),
    R.map(R.values),
    R.flatten,
    R.indexBy(R.prop("uuid")),
    R.values,
  )(players);

  const playerLogs = R.pipe(
    R.values,
    R.map(
      R.map(
        R.pipe(
          R.values,
          R.pluck("players"),
          R.map(R.pipe(R.values, R.filter(R.has("value")), R.pluck("value"))),
          R.flatten,
        ),
      ),
    ),
    R.map(R.values),
    R.flatten,
    R.indexBy(R.prop("uuid")),
    R.values,
  )(players);

  const playerStatLogs = R.pipe(
    R.values,
    R.map(
      R.map(
        R.pipe(
          R.values,
          R.pluck("players"),
          R.map(
            R.pipe(
              R.values,
              R.filter(R.has("stats")),
              R.pluck("stats"),
              R.flatten,
            ),
          ),
          R.flatten,
        ),
      ),
    ),
    R.map(R.values),
    R.flatten,
  )(players);

  const playerTransfersLogs = R.pipe(
    R.values,
    R.map(
      R.map(
        R.pipe(
          R.values,
          R.pluck("players"),
          R.map(
            R.pipe(
              R.values,
              R.filter(R.has("transfers")),
              R.pluck("transfers"),
              R.flatten,
            ),
          ),
          R.flatten,
        ),
      ),
    ),
    R.map(R.values),
    R.flatten,
    R.reject(R.isNil),
  )(players);

  const playerInjuryLogs = R.pipe(
    R.values,
    R.map(
      R.map(
        R.pipe(
          R.values,
          R.pluck("players"),
          R.map(
            R.pipe(
              R.values,
              R.filter(R.has("injuries")),
              R.pluck("injuries"),
              R.flatten,
            ),
          ),
          R.flatten,
        ),
      ),
    ),
    R.map(R.values),
    R.flatten,
    R.reject(R.isNil),
  )(players);

  const playerSoftStatLogs = R.pipe(
    R.values,
    R.map(
      R.map(
        R.pipe(
          R.values,
          R.pluck("players"),
          R.map(
            R.pipe(
              R.values,
              R.filter(R.has("softTraits")),
              R.pluck("softTraits"),
              R.flatten,
            ),
          ),
          R.flatten,
        ),
      ),
    ),
    R.map(R.values),
    R.flatten,
  )(players);

  const otherLogs = R.pipe(
    R.flatten,
    R.groupBy(R.prop("type")),
    R.mapObjIndexed(R.pipe(R.pluck("value"), R.flatten)),
  )(log);

  return {
    ...otherLogs,
    players: playerLogs,
    teams: teamLogs,
    matches: matchLogs,
    stats: playerStatLogs,
    softStats: playerSoftStatLogs,
    transfers: playerTransfersLogs,
    injuries: playerInjuryLogs,
  };
};

const insert = ({
  distances,
  dribbles,
  fouls,
  passes,
  recoveries,
  saves,
  shots,
  sprints,
  substitutions,
  players,
  teams,
  matches,
  stats,
  softStats,
  transfers,
  injuries,
}: any) => {
  const saveTeams = () =>
    sql`insert into teams ${sql(teams, "uuid", "name", "country")}`.then(
      R.tap(console.log),
    );
  const savePlayers = () =>
    sql`insert into players ${sql(
      players,
      "uuid",
      "fullname",
      "name",
      "birth_place",
      "birth_date",
      "preferred_foot",
      "height",
      "weight",
    )}`.then(R.tap(console.log));
  const saveMatches = () =>
    sql`insert into matches ${sql(
      matches,
      "uuid",
      "team1",
      "team2",
      "place",
      "matchday",
      "scheduled",
      "league",
      "season",
    )}`.then(R.tap(console.log));
  const saveStats = () => {
    console.log("stats");
    const rounds = R.splitEvery(1000, stats);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into player_stat_logs ${sql(
          round,
          "player",
          "date_recorded",
          "field",
          "value",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveSoftStats = () => {
    console.log("softstats");
    const rounds = R.splitEvery(1000, softStats);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into player_soft_trait_logs ${sql(
          round,
          "player",
          "date_recorded",
          "field",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveTransfers = () => {
    console.log("transfers");
    const rounds = R.splitEvery(1000, transfers);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into player_transfer_logs ${sql(
          round,
          "player",
          "team_from",
          "team_to",
          "start_date",
          "end_date",
          "transfer_type",
          "value",
        )}`,
    );
    return Promise.allSettled(promises).then(R.tap(console.log));
  };
  const saveInjuries = () => {
    console.log("injuries");
    const rounds = R.splitEvery(1000, injuries);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into player_injury_logs ${sql(
          round,
          "player",
          "start_date",
          "end_date",
          "name",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const savePasses = () => {
    console.log("passes");
    const rounds = R.splitEvery(1000, passes);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into pass_logs ${sql(
          round,
          "match",
          "player",
          "teammate",
          "minute",
          "x",
          "y",
          "touch",
          "type",
          "origin",
          "distance",
          "is_completed",
          "is_key",
          "is_assist",
          "is_chance_created",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveShots = () => {
    console.log("shots");
    const rounds = R.splitEvery(1000, shots);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into shot_logs ${sql(
          round,
          "match",
          "player",
          "minute",
          "x",
          "y",
          "touch",
          "origin",
          "distance",
          "is_on_target",
          "is_goal",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveRecoveries = () => {
    console.log("recoveries");
    const rounds = R.splitEvery(1000, recoveries);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into recovery_logs ${sql(
          round,
          "match",
          "player",
          "opponent",
          "minute",
          "x",
          "y",
          "touch",
          "recovery",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveFouls = () => {
    console.log("fouls");
    const rounds = R.splitEvery(1000, fouls);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into foul_logs ${sql(
          round,
          "match",
          "player",
          "opponent",
          "minute",
          "x",
          "y",
          "sanction",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveSubstitutions = () => {
    console.log("subs");
    const rounds = R.splitEvery(1000, substitutions);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into substitution_logs ${sql(
          round,
          "match",
          "player",
          "teammate",
          "minute",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveDribbles = () => {
    console.log("dribs");
    const rounds = R.splitEvery(1000, dribbles);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into dribble_logs ${sql(
          round,
          "match",
          "player",
          "opponent",
          "minute",
          "x",
          "y",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveDistances = () => {
    console.log("distance");
    const rounds = R.splitEvery(1000, distances);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into distance_logs ${sql(
          round,
          "match",
          "player",
          "minute",
          "meters",
          "heatmap",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveSprints = () => {
    console.log("sprints");
    const rounds = R.splitEvery(1000, sprints);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into sprint_logs ${sql(
          round,
          "match",
          "player",
          "minute",
          "meters",
          "heatmap",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };
  const saveSaves = () => {
    console.log("save");
    const rounds = R.splitEvery(1000, saves);
    const promises = rounds.map(
      (round: any) =>
        sql`insert into save_logs ${sql(
          round,
          "match",
          "player",
          "minute",
          "type",
        )}`,
    );
    return Promise.all(promises).then(R.tap(console.log));
  };

  return (
    saveTeams()
      .then(savePlayers)
      .then(saveMatches)
      .then(saveStats)
      .then(saveSoftStats)
      .then(saveTransfers)
      .then(saveInjuries)
      .then(savePasses)
      .then(saveShots)
      .then(saveRecoveries)
      .then(saveFouls)
      .then(saveSubstitutions)
      .then(saveDribbles)
      // .then(saveDistances)
      // .then(saveSprints)
      .then(saveSaves)
      .catch(console.log)
  );
};

getAllFiles()
  .then(fillPlayers)
  .then(fillMatches)
  .then(simulate)
  .then(insert)
  .catch(console.log);
