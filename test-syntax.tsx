// Test file to isolate the syntax error
const testFunction = () => {
  const aantalMatch = "aantal test 3".match(/aantal\s+(\w+)\s+(\d+)/);
  if (aantalMatch) {
    const [, type, number] = aantalMatch;
    console.log(type, number);
  }
};

export default testFunction;