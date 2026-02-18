# Top Streaks

Like DenverCoder1/github-readme-streak-stats but shows your **all-time top 3/5/10 streaks**.


## Deploy to Vercel (free)

```bash
npm i -g vercel
vercel --env GITHUB_TOKEN=your_token_here
```

## Usage

After deploy, use in your README:

```md
![Top Streaks](https://your-app.vercel.app/?username=YourGitHubUsername&top=3)
```

Change `top=3` to `top=5` or `top=10`.

## Get a GitHub Token

1. Visit [this link](https://github.com/settings/tokens/new?description=top%20steaks) to create a new Personal Access Token (no scopes required). 
2. Scroll to the bottom and click "Generate token". (no scopes required)
3. Copy token → set as `GITHUB_TOKEN` env var in Vercel

## Local test

```bash
GITHUB_TOKEN=xxx node -e "
const h = require('./api/index');
h({query:{username:'torvalds',top:'5'}}, {
  setHeader:()=>{}, send:(s)=>require('fs').writeFileSync('out.svg',s)
})
"
```
## License

This project is open source and available under the [MIT License](LICENSE).


## More Extensions by Developer
<ul>
  <li><a href="https://dub.sh/zizvsc">My VS Code Publisher link</a></li>
  <li><a href="https://dub.sh/zizovpsx">My Open-VSX Publisher link</a></li>
  <li><a href="https://dub.sh/deletething">DeleteThing Chrome Extension</a></li>
</ul>  

