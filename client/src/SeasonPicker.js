import React from "react";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";

export default function SeasonPicker({
  styleClass,
  currentSeason,
  seasons,
  langObj,
  handleSeasonChange,
}) {
  const [season, setSeason] = React.useState(currentSeason);

  const handleChange = (event) => {
    setSeason(event.target.value);
    handleSeasonChange(event.target.value);
  };

  return (
    <div>
      <FormControl className={styleClass}>
        <InputLabel id="season-select-label">
          {langObj.seasonPicker.SEASON_PICKER_SEASON_LABEL}
        </InputLabel>
        <Select
          labelId="season-select-label"
          id="season-select"
          value={season}
          onChange={handleChange}
        >
          {seasons.map((s, index) => (
            <MenuItem key={index} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
