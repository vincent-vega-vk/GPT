import { useGameStore } from './store/gameStore';
import Welcome from './screens/Welcome';
import TeamSelect from './screens/TeamSelect';
import SquadHub from './screens/SquadHub';
import TacticalBoard from './screens/TacticalBoard';
import PreMatch from './screens/PreMatch';
import LiveMatch from './screens/LiveMatch';
import PostMatch from './screens/PostMatch';
import PressConference from './screens/PressConference';
import DressingRoom from './screens/DressingRoom';
import GroupTables from './screens/GroupTables';
import KnockoutBracket from './screens/KnockoutBracket';
import BetweenMatches from './screens/BetweenMatches';
import TournamentEnd from './screens/TournamentEnd';

export default function App() {
  const phase = useGameStore(s => s.phase);
  switch (phase) {
    case 'WELCOME': return <Welcome />;
    case 'TEAM_SELECT': return <TeamSelect />;
    case 'SQUAD_HUB': return <SquadHub />;
    case 'TACTICAL_BOARD': return <TacticalBoard />;
    case 'PRE_MATCH': return <PreMatch />;
    case 'LIVE_MATCH': return <LiveMatch />;
    case 'POST_MATCH': return <PostMatch />;
    case 'PRESS_CONFERENCE': return <PressConference />;
    case 'DRESSING_ROOM': return <DressingRoom />;
    case 'GROUP_TABLES': return <GroupTables />;
    case 'KNOCKOUT_BRACKET': return <KnockoutBracket />;
    case 'BETWEEN_MATCHES': return <BetweenMatches />;
    case 'TOURNAMENT_END': return <TournamentEnd />;
    default: return <Welcome />;
  }
}
