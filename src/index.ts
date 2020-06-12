import { getVacancies } from './hh/vacancies.ts'
import { green, yellow, red } from 'https://deno.land/std/fmt/colors.ts';
import { ensureDir } from "https://deno.land/std/fs/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import { analyzeVacancies } from './hh/analyze.ts';


/// CLI PART

const cli_args = parse(Deno.args);

//* main query *//
const text = cli_args.query ?? ''; // --query=*vacancy_name*

//* avoid words not pass to log *//
const avoid_words: string[] = (
  cli_args.avoid instanceof Array ? cli_args.avoid : (
    cli_args.avoid === undefined ? [] : [ cli_args.avoid ]
  )
); // --avoid=A --avoid=B

//* limit of parsing items *//
const limit: number = cli_args.limit ?? 100; // --limit=number

//* area of vacancy *//
/**
 * TASK: change numbers-codes to strings like 'Russia', 'Ukraine' etc
 * LINK: https://github.com/hhru/api/blob/master/docs/suggests.md#areas
**/
const area: number = cli_args.area ?? 113; // --area=113 // where 113 - Russia

//* sorting order *//
const order_by = cli_args.order ?? 'salary_desc';

//* experience *//
/**
 * TASK: make experience takes numbers instead strings like --experience=2
**/
const experience = cli_args.experience ?? 'noExperience'

//* not fetch *//
const not_fetch: boolean = cli_args.n ?? false; // -n

//* analyze flag *//
const analyze: boolean = cli_args.a ?? false; // -a

/// Headers

const hh_headers: HeadersInit = {
  'User-Agent': 'deno_hh_parser/0.2.0'
}


/// FETCH PART

if (!not_fetch) {
  console.log(yellow('FETCH NEW DATA'))

  const data = await getVacancies({
    baseURL: 'https://api.hh.ru',
    method: '/vacancies',
    query: {
      '?no_magic': true,
      'area': area,
      'per_page': 100,
      'page': 0,
      'order_by': order_by,
      'text': text,
      'search_field': 'name',
      'experience': experience
    }
  }, hh_headers, limit, avoid_words);


  /// SAVE PART
  await ensureDir("./log");

  await Deno.writeFile("./log/vacancies.json", new TextEncoder().encode(JSON.stringify(data, undefined, 2)));
  console.log(green('vacancies.json have been saved'));
} else {
  console.log(yellow('NOT FETCH NEW DATA'))
}


/// ANALYZE PART

if (analyze) {
  console.log(yellow('ANALYZE'))

  console.log(yellow('Preparation to alalyze'));
  await ensureDir("./log");

  const decoder = new TextDecoder("utf-8");
  const data: any[] = JSON.parse(decoder.decode(await Deno.readFile("./log/vacancies.json")));
  console.log(green('Read vacancies.json file'));

  const urls: string[] = []; // url-fields
  data.forEach(vac => {
    urls.push(vac.url);
  });

  const start = new Date().getTime();
  console.log(yellow('Analyzing...'));
  const analyzed_data = await analyzeVacancies(urls);
  const end = new Date().getTime();
  console.log(green(`Data have been analyzed in ${ (end - start) / 1000 } sec`));

  console.log(yellow('Saving...'));
  await Deno.writeFile("./log/key_skills.json", new TextEncoder().encode(JSON.stringify(analyzed_data, undefined, 2)));
  console.log(green('key_skills.json have been saved'));
}
