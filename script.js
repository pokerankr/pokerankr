let remaining = starters.map(p => ({
  ...p,
  roundsSurvived: 0
}));
let eliminated = [];

let currentChampion = null;
let currentChallenger = null;
const useShiny = false;

function getImageUrl(id) {
  const base = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
  return useShiny
    ? `${base}/shiny/${id}.png`
    : `${base}/${id}.png`;
}

function startBattle() {
  if (remaining.length < 2) {
    showWinner(remaining[0]);
    return;
  }

  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  currentChampion = shuffled[0];
  currentChallenger = shuffled[1];

  renderMatchup();
}

function nextBattle() {
  if (remaining.length === 1) {
    showWinner(currentChampion);
    return;
  }

  const available = remaining.filter(p => p.id !== currentChampion.id);
  currentChallenger = available[Math.floor(Math.random() * available.length)];
  renderMatchup();
}

function renderMatchup() {
  document.getElementById("left").innerHTML = `
    <img src="${getImageUrl(currentChampion.id)}" alt="${currentChampion.name}" />
    <p>${currentChampion.name}</p>
  `;

  document.getElementById("right").innerHTML = `
    <img src="${getImageUrl(currentChallenger.id)}" alt="${currentChallenger.name}" />
    <p>${currentChallenger.name}</p>
  `;
}

function pick(choice) {
  // Give both Pokémon credit for surviving a round
  currentChampion.roundsSurvived++;
  currentChallenger.roundsSurvived++;

  const loser = choice === 'left' ? currentChallenger : currentChampion;
  const winner = choice === 'left' ? currentChampion : currentChallenger;

  // Remove loser from remaining, add to eliminated
  remaining = remaining.filter(p => p.id !== loser.id);
  eliminated.push(loser);

  // Promote winner to next round
  currentChampion = winner;

  nextBattle();
}

function showWinner(finalWinner) {
  document.getElementById("matchup").style.display = "none";

  // Filter out the final winner
  const cleaned = eliminated.filter(p => p.id !== finalWinner.id);

  // Find runner-ups with more than 1 round survived
  const validRunnerUps = cleaned
    .filter(p => p.roundsSurvived > 1)
    .sort((a, b) => b.roundsSurvived - a.roundsSurvived)
    .slice(0, 2);

  let runnerUpHTML = '';
  if (validRunnerUps.length > 0) {
    runnerUpHTML = `
      <h3>Runner-Ups:</h3>
      <div style="display:flex; justify-content:center; gap:1rem;">
        ${validRunnerUps.map(p => `
          <div>
            <img src="${getImageUrl(p.id)}" alt="${p.name}" width="100" />
            <p>${p.name}</p>
            <p style="font-size: 0.9rem; color: #666;">Survived ${p.roundsSurvived} rounds</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `
    <h2>Your Favorite Starter is:</h2>
    <img src="${getImageUrl(finalWinner.id)}" alt="${finalWinner.name}" />
    <h3>${finalWinner.name}</h3>
    <p style="font-weight: bold; color: #4f46e5;">🏆 Champion!</p>

    ${runnerUpHTML}

    <button onclick="restart()">Start Over</button>
  `;
  resultDiv.style.display = "block";
}




function restart() {
  remaining = starters.map(p => ({
    ...p,
    roundsSurvived: 0
  }));
  eliminated = [];
  currentChampion = null;
  currentChallenger = null;

  document.getElementById("result").style.display = "none";
  document.getElementById("matchup").style.display = "flex";
  startBattle();
}

// Optional: keybind support
document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowLeft') pick('left');
  else if (e.key === 'ArrowRight') pick('right');
});

startBattle();
