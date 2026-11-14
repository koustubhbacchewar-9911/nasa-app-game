export const storm = {
  id: '30717/1',
  time: '2024-05-11T04:07:00Z',
  displayTime: '11 May 2024 · 04:07 UTC',
  detector: 'STEREO-A',
  url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/SEP/30717/1',
}

export const radio = { oneWayMs: 1280, roundTripMs: 2560 }

export const sources = [
  { agency: 'NASA · LRO', title: 'Shadows at the lunar South Pole', url: 'https://svs.gsfc.nasa.gov/4930', detail: 'NASA modeled sunlight using Lunar Orbiter Laser Altimeter terrain. Seven consecutive frames were sampled every two hours at the same image location. The first six drive the solar array each turn.' },
  { agency: 'NASA · CCMC', title: 'DONKI solar particle archive', url: storm.url, detail: 'The STEREO-A detection from 11 May 2024 triggers the shelter exercise. The storm is replayed in a fictional mission, and exposure points describe the game.' },
  { agency: 'NASA · ISS', title: 'Veggie plant growth system', url: 'https://science.nasa.gov/mission/veggie/', detail: 'ISS Veggie uses LEDs to grow fresh produce. In the game, the grow lights spend power to advance a crop already near harvest.' },
  { agency: 'NASA · ISS', title: 'Environmental control and life support', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/', detail: 'Station equipment generates oxygen and removes carbon dioxide. The game groups these systems into one air machine and a backup air reserve.' },
  { agency: 'NASA · Lunar Prospector', title: 'Radio travel time to the Moon', url: 'https://pds.nasa.gov/data/lp-l-6-position-v1.0/lp_0019/document/volsis.htm', detail: 'NASA gives 1.28 seconds for the average one-way trip. The game waits 2.56 seconds for a round trip, with an instant reply from Earth after reception.' },
  { agency: 'Canadian Space Agency', title: 'Growing food on the Moon', url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/', detail: 'Activities and readings for learning more about the greenhouse decision after playing.' },
]
