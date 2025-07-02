// Time-related utility functions

// Helper function to format time in various formats (MM:SS, HH:MM:SS, HH:MM:SS:CS)
export const formatTimeCode = (
  timeInSeconds: number,
  format: "MM:SS" | "HH:MM:SS" | "HH:MM:SS:CS" = "HH:MM:SS:CS"
): string => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const centiseconds = Math.floor((timeInSeconds % 1) * 100);

  switch (format) {
    case "MM:SS":
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    case "HH:MM:SS":
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    case "HH:MM:SS:CS":
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${centiseconds.toString().padStart(2, "0")}`;
  }
};
