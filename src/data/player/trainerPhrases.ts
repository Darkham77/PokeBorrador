/**
 * Database of trainer personality traits and phrases.
 */

const TRAINER_PHRASES: Record<string, string[]> = {
  timido: [
    "B-bueno... si insistes, supongo que podemos combatir...",
    "Espero no hacerlo demasiado mal... ¡allá voy!",
    "Me da un poco de vergüenza, ¡pero mis Pokémon se esforzarán!",
    "P-por favor, sé amable conmigo...",
    "¿Podríamos combatir rápido? Me pongo nervioso con la gente...",
    "N-no soy muy bueno en esto, pero daré lo mejor...",
    "¡Ah! ¡Me has asustado! E-está bien, combatamos...",
    "¿Seguro que quieres pelear conmigo? No soy un gran desafío...",
    "M-mis Pokémon confían en mí, así que no puedo huir...",
    "Espero que podamos ser amigos después de esto...",
    "U-un combate... ¡s-sí! ¡Hagámoslo!",
    "A veces me cuesta hablar, pero mis Pokémon se expresan por mí.",
    "¡Ojalá mi corazón no latiera tan rápido ahora mismo!",
    "S-si gano... lo sentiré mucho. ¡Y si pierdo también!",
    "¡Ay! ¡No me mires de esa forma tan decidida!",
    "M-mi estrategia es simple... espero que funcione.",
    "¿Podemos hacerlo sin hacer mucho ruido? Qué timidez...",
    "N-no te pareces a los otros entrenadores... pareces muy fuerte.",
    "¡L-listo o no, aquí vamos!",
    "S-solo jugaré un ratito... ¡no me presiones mucho!"
  ],
  audaz: [
    "¡No le temo a nada! ¡Prepárate para sentir el poder de mi equipo!",
    "¡Un verdadero entrenador avanza siempre hacia adelante con valentía!",
    "¡El peligro es mi segundo nombre! ¡A combatir!",
    "¡Desafiaré cualquier obstáculo! ¡Muéstrame lo que tienes!",
    "¡Mis Pokémon y yo somos imparables! ¡No daremos ni un paso atrás!",
    "¡Si hay un desafío en el camino, lo enfrento de frente!",
    "¡La fortuna sonríe a los valientes! ¡Vamos a por todas!",
    "¡No importa el rival, siempre doy la cara con orgullo!",
    "¡El miedo no existe en nuestro vocabulario!",
    "¡Cada batalla es una oportunidad para demostrar nuestro valor!",
    "¡Mirada al frente y puños cerrados! ¡Allá vamos!",
    "¡No me rindo jamás! ¡Ese es mi camino ninja del entrenamiento!",
    "¡El calor de la batalla me hace sentir más vivo que nunca!",
    "¡Vamos a romper todos los límites hoy mismo!",
    "¡Con valentía en el pecho y fe en mis Pokémon!",
    "¡Quien no arriesga, no gana! ¡Vamos con todo!",
    "¡Acepto cualquier reto con la frente en alto!",
    "¡Mis Pokémon reflejan mi espíritu inquebrantable!",
    "¡Ninguna tormenta apagará nuestro fuego interno!",
    "¡Demostremos de qué estamos hechos!"
  ],
  competitivo: [
    "¡Sólo me interesa la victoria! ¡No pienso perder contra ti!",
    "¡Voy a demostrarte quién es el mejor de esta ruta!",
    "Mi racha de victorias no terminará hoy. ¡Prepárate!",
    "¡El segundo lugar no existe para mí! ¡A darlo todo!",
    "¡Espero que estés a la altura, porque yo no me contengo!",
    "¡Cada combate es una final de liga para mí!",
    "¡He entrenado día y noche para ser el número uno!",
    "No toleraré un solo error en mi estrategia. ¡A ganar!",
    "¡Tu derrota será otro escalón en mi camino al éxito!",
    "¡Que gane el mejor, y ese seré yo!",
    "No vine aquí a hacer amigos, vine a ganar medallas.",
    "¡Mis estadísticas son superiores a las tuyas, compruébalo!",
    "¡No me subestimes, juego para ganar!",
    "¡La victoria sabe mejor cuando el rival da pelea!",
    "¡Mis Pokémon tienen la mentalidad de campeones!",
    "¡Un verdadero competidor nunca baja la guardia!",
    "¡Voy a registrar otra victoria en mi historial!",
    "¡Cada punto de experiencia cuenta para la gloria!",
    "¡No te daré tregua, atacaré sin piedad!",
    "¡El trofeo ya tiene mi nombre grabado!"
  ],
  inteligente: [
    "He calculado cada variable. ¡Mi estrategia es perfecta!",
    "Según mis datos, la probabilidad de tu victoria es del 0%.",
    "Un combate Pokémon es pura lógica y análisis. ¡Demostrémoslo!",
    "He analizado tus movimientos anteriores... ¡sé exactamente qué harás!",
    "La fuerza bruta no sirve contra una mente brillante.",
    "La teoría siempre precede a una práctica impecable.",
    "Analizar el terreno de combate es el primer paso hacia el éxito.",
    "Tus Pokémon son interesantes, pero carecen de sinergia lógica.",
    "La matemática del combate nunca miente.",
    "Uso la física y la química de los tipos a mi favor.",
    "Un movimiento preciso vale más que diez ataques desesperados.",
    "He optimizado los EVs y naturalezas de mi equipo científico.",
    "Tu estilo de combate es predecible... lo deduje en segundos.",
    "La inteligencia táctica supera al nivel bruto.",
    "¡Observemos si puedes resolver esta ecuación de combate!",
    "Tengo un plan de contingencia para cada una de tus acciones.",
    "El orden de tus factores no alterará mi resultado de victoria.",
    "La paciencia y el estudio dan sus frutos en la arena.",
    "Cada turno es una jugada de ajedrez perfecta.",
    "He catalogado tu estilo en mi base de datos... ¡jaque mate!"
  ],
  misterioso: [
    "Las estrellas han predicho este encuentro... el destino está sellado.",
    "Siento una perturbación en el ambiente... algo grande va a pasar.",
    "Los Pokémon y el universo comparten secretos que tú no comprenderías...",
    "No me mires a los ojos... podrías ver el vacío.",
    "El viento susurra que este combate será legendario...",
    "Las sombras bailan a nuestro alrededor... ¿las sientes?",
    "El destino es un hilo invisible que nos ha unido aquí.",
    "Mis Pokémon provienen del lado oculto de la realidad.",
    "A veces el silencio dice más que mil palabras en la arena.",
    "La niebla revela la verdad a quienes saben mirar.",
    "No busques respuestas donde solo hay misterios...",
    "Mis tácticas fluyen como el agua en la oscuridad.",
    "Detrás de esta máscara hay un alma lista para combatir.",
    "Las viejas leyendas hablan de un encuentro como este.",
    "El cosmos guía mis elecciones de combate...",
    "Hay fuerzas ocultas que deciden quién saldrá vencedor.",
    "Un susurro del más allá me dice cómo ganarte.",
    "Venimos del olvido y al olvido volveremos tras el combate.",
    "Tu aura tiene un color muy peculiar hoy...",
    "El secreto de la victoria reside en lo invisible."
  ],
  entusiasta: [
    "¡Qué emoción! ¡Me encanta combatir con entrenadores fuertes!",
    "¡Vamos a divertirnos un montón! ¡Que empiece la fiesta de combates!",
    "¡Mira a mis Pokémon, están súper listos para dar lo mejor!",
    "¡Hola! ¡Hagamos de este el mejor combate del día!",
    "¡Qué gran día para un combate Pokémon! ¡A tope!",
    "¡No puedo contener la alegría de estar aquí combatiendo!",
    "¡Cada segundo en este viaje es increíble! ¡A jugar!",
    "¡Espero ver tus mejores movimientos con una gran sonrisa!",
    "¡La energía está al máximo! ¡Vamos, vamos, vamos!",
    "¡Qué alegría ver a otro entrenador en esta ruta!",
    "¡Mis Pokémon saltan de emoción por empezar el combate!",
    "¡Hagamos que todo el mundo oiga nuestros gritos de combate!",
    "¡El entusiasmo es nuestra mejor arma hoy!",
    "¡Qué divertido es descubrir nuevas estrategias y Pokémon!",
    "¡Siente la vibra positiva de nuestro equipo!",
    "¡Viva el combate libre y alegre! ¡Vamos con todo!",
    "¡Aprenderemos muchísimo de esta batalla, pase lo que pase!",
    "¡La pasión por los Pokémon nos une a todos!",
    "¡Estoy tan feliz que podría bailar en la arena!",
    "¡Que la diversión nunca se detenga! ¡A batallar!"
  ],
  agresivo: [
    "¡Te voy a aplastar! ¡No tendrás ninguna oportunidad!",
    "¡Quítate de mi camino o tendré que obligarte a base de golpes!",
    "¡Mi equipo no tiene piedad! ¡Prepárate para morder el polvo!",
    "¡¿Qué me estás mirando?! ¡Te arrepentirás de cruzar mi mirada!",
    "¡Voy a destrozar tu estrategia en un solo turno!",
    "¡No vine a jugar, vine a destruirte!",
    "¡Siente la furia indomable de mi escuadrón!",
    "¡Te arrepentirás de haber salido de casa hoy!",
    "¡No esperes compasión de mi parte, esto es la guerra!",
    "¡Voy a borrar esa sonrisa de tu cara de un golpe!",
    "¡El poder absoluto aplasta cualquier técnica débil!",
    "¡La debilidad me irrita! ¡Te lo demostraré en combate!",
    "¡Mis ataques van directos a hacer daño de verdad!",
    "¡Te enseñaré a respetar a los verdaderos luchadores!",
    "¡Ningún escudo detendrá la fuerza de mi ofensiva!",
    "¡Voy a barrer la arena con tus Pokémon!",
    "¡Prepárate para una derrota dolorosa y rápida!",
    "¡No tienes el nivel para respirar el mismo aire que yo!",
    "¡La piedad es para los perdedores!",
    "¡Tiembla ante el rugido de mi equipo!"
  ],
  relajado: [
    "Bueno, no hay prisa... hagamos un combate tranquilo, ¿te parece?",
    "Ganar o perder da igual, lo important es disfrutar del paisaje.",
    "Qué pereza... pero en fin, un combate rápido no viene mal.",
    "Tomémonos las cosas con calma... ¡mis Pokémon van a su propio ritmo!",
    "¿Combatir? Claro, por qué no... después de una buena siesta.",
    "El sol está tan agradable... combatamos sin esforzarnos demasiado.",
    "No te estreses tanto, el mundo no se va a acabar hoy.",
    "La brisa del viento me da sueño, pero venga, juguemos un rato.",
    "Prefiero una buena merienda, pero un combate también es entretenido.",
    "Mis Pokémon prefieren relajarse, pero obedecen si se lo pido con calma.",
    "Disfruta de la vida, no todo es competir a muerte.",
    "Vamos despacito, saboreando cada movimiento del combate.",
    "Si perdemos, nos tumbamos a descansar bajo este árbol.",
    "El estrés arruina la belleza de los combates Pokémon.",
    "Quédate tranquilo, esto es solo un juego amistoso.",
    "No pongas esa cara tan seria, relaja los hombros.",
    "Mis Pokémon combaten mejor cuando no tienen presiones.",
    "Vamos a ver qué pasa, al fin y al cabo la vida sigue igual.",
    "Cero tensiones por aquí... ¡que fluya la energía!",
    "El mejor combate es el que se hace con una mente despejada."
  ]
};

const TRAINER_PERSONALITIES: Record<string, string[]> = {
  caza_bichos: ["timido", "entusiasta"],
  ornitologo: ["audaz", "entusiasta"],
  cientifico: ["inteligente", "relajado"],
  luchador: ["competitivo", "agresivo"],
  pescador: ["relajado", "timido"],
  nadador: ["entusiasta", "relajado"],
  domador: ["audaz", "agresivo"],
  medium: ["misterioso", "inteligente"],
  motorista: ["agresivo", "competitivo"],
  montanero: ["relajado", "audaz"],
  policeman: ["competitivo", "inteligente"],
  rocket: ["agresivo", "competitivo"],
  criador: ["relajado", "entusiasta"],
  aristocrata: ["inteligente", "relajado"],
  ranger: ["audaz", "relajado"],
  pokefan: ["entusiasta", "timido"],
  artista: ["misterioso", "entusiasta"],
  trainers: ["competitivo", "inteligente"],
  default: ["entusiasta", "competitivo"]
};

// Precompute combined phrases for each trainer type key at module loading time
const PRECOMPUTED_TRAINER_PHRASES: Record<string, string[]> = {};

for (const [trainerType, personalities] of Object.entries(TRAINER_PERSONALITIES)) {
  const quotes: string[] = [];
  personalities.forEach(trait => {
    const traitQuotes = TRAINER_PHRASES[trait];
    if (traitQuotes) {
      quotes.push(...traitQuotes);
    }
  });
  PRECOMPUTED_TRAINER_PHRASES[trainerType] = quotes;
}

/**
 * Returns a random quote from the precomputed dictionary for O(1) performance.
 */
export function getRandomQuoteForTrainer(trainerTypeKey: string): string {
  const quotes = PRECOMPUTED_TRAINER_PHRASES[trainerTypeKey];
  if (!quotes || quotes.length === 0) {
    throw new Error(`Missing custom phrases or personality for trainer type "${trainerTypeKey}" in trainerPhrases.ts`);
  }

  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];
  if (!quote) {
    throw new Error(`Empty quote resolved at index ${randomIndex} for trainer type "${trainerTypeKey}"`);
  }
  return quote;
}
