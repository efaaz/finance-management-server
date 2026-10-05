export const generateReportCode = () => {
    const timePart = Date.now()
        .toString(36)
        .toUpperCase();

    const randomPart = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

    return `FINX-${timePart}-${randomPart}`;
};