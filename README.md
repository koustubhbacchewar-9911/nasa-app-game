# Shadow Shift

A browser adventure for ages 7–12 built for the **2026 NASA Space Apps Challenge, Build a Junior Astronaut Mission Trainer**. Place equipment at a fictional lunar South Pole outpost, then use the crew’s battery and oxygen reserves to survive the shadow and plan the handover.

## Play

- Start Mission opens the Apollo 11 descent film, then lets you survey two modeled landing zones before committing. The lander touches down at your chosen pad. Pip guides you through building and running the 3D outpost.
- Hover, focus or tap a mount to preview it in the 3D world. Choose a mount, walk or use Follow Marker to reach it, and press E or tap Build. The machine and its console stay at that location. During the shift, the station consoles show four solar banks, six individual lettuce plants, shelter gaps, rover routes, oxygen tanks, antenna alignment and field instruments. Compare signed resource changes before each action and watch the result in the outpost.
- Explore the 3D outpost opens the six-turn training shift. Move with WASD, arrow keys or touch controls. Drag the scene to turn the camera and press E near the highlighted equipment. Tap the ground to walk there, or use Follow Marker to take the marked path. Colony View raises the camera to show the entire base.
- Choose **Use console mode** at any objective to go straight to the mission tools. The console also opens automatically when WebGL is unavailable.
- Set the greenhouse dimmer within the battery budget, trace a rover route, place water pods over gaps in the shield, and align the antenna and assemble a status message. Full lighting consumes more power, rover shortcuts cost power and reduce exposure, and the spare cell from Pip’s kit can power the call.
- Judge Demo jumps to the last sunlit turn. The debrief shows each turn and lets you change the greenhouse schedule and replay the same follow-up jobs.
- Use a pointer, touch or keyboard. The speaker button enables the original synth background music and effects. The music grows more urgent during the storm and settles at mission handover. The game supports reduced motion.
- The 3D terrain and equipment are fictional models. NASA’s illumination frames are available in the evidence viewer.
- The 3D world uses Three.js and WebGL 2. If graphics are unavailable, the browser can still run the mission tools.

## Run locally

Requires Node 24. Use the lockfile with the following commands.

```sh
npm ci
npm run dev
```

Run `npm run check` for type checking, `npm test` for game and data checks, or `npm run build` to generate `dist/`. Use `npm run preview` to serve the production build locally.

## Deploy

Import this repository in Vercel using the **Vite** preset. Use `npm run build` and output directory `dist`. The same output works with Netlify or GitHub Pages. All game inputs and art are bundled, and the game needs no server, account, or API key.

## Data sources

| Source | How the game uses it |
| --- | --- |
| [NASA Scientific Visualization Studio, LRO/LOLA South Pole illumination](https://svs.gsfc.nasa.gov/4930) | NASA's model frames drive solar power. View all seven model frames and the sample point in **Real Moon data**. |
| [NASA CCMC DONKI, SEP 30717/1](https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/SEP/30717/1) | STEREO-A detected fast solar particles at 04:07 UTC on 11 May 2024. The archived detection starts the shelter training scene. See the [storm summary and DONKI listings](https://ccmc.gsfc.nasa.gov/TP/2024-05-TP-02/). |
| [NASA ISS Veggie](https://science.nasa.gov/mission/veggie/) | A real LED plant system informs the power costs of keeping a greenhouse lit. |
| [NASA ISS Environmental Control and Life Support Systems](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/) | Oxygen supply and air revitalization inform the backup air mechanic. |
| [NASA Lunar Prospector documentation](https://pds.nasa.gov/data/lp-l-6-position-v1.0/lp_0019/document/volsis.htm) | The published average 1.28-second one-way light time sets the game's 2.56-second radio round trip. |
| [Canadian Space Agency food production toolkit](https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/) | Activities for continuing the greenhouse lesson after playing. |

### Reproduce the solar inputs

The [2026 frame directory](https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004930/frames/1920x1080_16x9_30p/2026/) contains original TIFFs. Download frames 0060 to 0066 and inspect the red channel of the original 1920 × 1080 renders at three horizontal pixels, x = 1505, 1508 and 1511 at y = 320, using zero-based top-left origin. The rounded mean values are 136, 70, 0, 0, 0, 47 and 63. With a grayscale threshold of 40, the corresponding states are sun, sun, shade, shade, shade, sun, sun. The first six states drive the six turns and the final frame is available for comparison. Each frame is spaced two Earth hours apart. The evidence viewer uses cropped, downscaled JPEGs to show the terrain without the source frame overlays. Frame 0060 shows January 5, 2026 at 22:00 UTC. Visualization credit goes to NASA Scientific Visualization Studio and Ernie Wright.

The sample point is an image location for a fictional panel array. A frame-derived sun/shade flag is a teaching approximation. Panel output, battery loads, crop progress and exposure points are simplified game values. The player advances a lettuce crop already near harvest. The 2024 solar event and 2026 modeled lighting are combined into one training scenario. Exposure points describe in-game choices.

## AI/SI Disclosure

OpenAI Codex assisted with code generation. OpenAI ImageGen created the original fictional outpost, interior and crew art from prompts in [ARTWORK.md](ARTWORK.md). The launch uses Neil Armstrong’s [Apollo 11 photograph AS11-40-5903](https://eol.jsc.nasa.gov/SearchPhotos/photo.pl?frame=5903&mission=AS11&roll=40), credited to NASA. The opening uses a silent 28-second excerpt of the [NASA Apollo 11 powered-descent film](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landmov.html), digitized by Gary Neff. The NASA terrain frames and archive record retain their source credit.

## License

See [LICENSE](LICENSE) for the project code and original game assets. The bundled NASA imagery is credited above and is subject to [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

Barlow Condensed and DM Sans are bundled under the SIL Open Font License. Their notices are in [public/fonts](public/fonts).

