// Retention team leads' own sales may already appear in a manager grouping row.
export const getSalesContributors = (name, directReports = [], selfGrouped = false) => {
  const members = [...new Set(directReports.filter((member) => member && member !== name))];
  return {
    contributors: selfGrouped && members.length ? members : [name, ...members],
    teamMemberNames: members,
  };
};

export const getSalesBreakdown = (name, rows, teamMemberNames) =>
  teamMemberNames.length
    ? rows.map((row) => ({ ...row, name: row.name === name ? `${name} (Self)` : row.name }))
    : [];
