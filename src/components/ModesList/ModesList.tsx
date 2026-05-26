// src/components/ModesList/ModesList.tsx

import "./ModesList.css"; // измените на путь к вашему CSS
import ModeCard from "../ModeCard/ModeCard.tsx"; // убедитесь, что путь правильный
import { type DrivingMode } from "../../modules/modeApi"; // замените на ваш путь к API

interface ModesListProps { // добавлен интерфейс для пропсов
  modes: DrivingMode[]; // заменено с tires на modes
}

export default function ModesList({ modes }: ModesListProps) { // заменено с TiresList на ModesList
  return (
      <div className="container">
        {modes.map((mode) => ( // заменено с tire на mode
            <ModeCard key={mode.mode_id} mode={mode} /> // заменено с tire.tire_id на mode.id, и tire={tire} на mode={mode}
        ))}
      </div>
  );
}