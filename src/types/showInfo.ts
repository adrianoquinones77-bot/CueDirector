export interface ShowInfo {
  showName: string;
  venue: string;
  city: string;
  country: string;
  date: string;
  artist: string;
  director: string;
}

export const defaultShowInfo: ShowInfo = {
  showName: "",
  venue: "",
  city: "",
  country: "",
  date: "",
  artist: "",
  director: "",
};
