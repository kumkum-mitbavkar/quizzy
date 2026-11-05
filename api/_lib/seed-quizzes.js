// Three quizzes made by the demo host account, so the "Class quizzes" shelf and PIN join work on day one.
export const SEED_QUIZZES = [
  {
    id: 'qz-sql-showdown', pin: '482913', ownerId: 'u-demo', ownerName: 'Ms. Deshpande',
    title: 'SQL Showdown', topic: 'DBMS', colour: 'azure', seconds: 20, shuffle: true, published: true,
    description: 'Joins, GROUP BY and the queries that come up in every placement test.',
    questions: [
      { q: 'Which clause filters groups after GROUP BY?', options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], answer: 1, why: 'WHERE filters rows before grouping; HAVING filters the groups that GROUP BY produces.' },
      { q: 'What does this return if the table has 5 rows and 2 NULLs in marks?', code: 'SELECT COUNT(marks) FROM results;', options: ['5', '3', '2', 'NULL'], answer: 1, why: 'COUNT(column) skips NULLs. COUNT(*) would count all 5 rows.' },
      { q: 'Which join keeps every row of the left table, even without a match?', options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'], answer: 1, why: 'A LEFT JOIN returns all left rows and fills the right side with NULL where nothing matches.' },
      { q: 'Which command removes all rows but keeps the table structure?', options: ['DROP', 'DELETE TABLE', 'TRUNCATE', 'REMOVE'], answer: 2, why: 'TRUNCATE empties the table quickly and keeps its columns; DROP removes the table itself.' },
      { q: 'A primary key column can contain…', options: ['Duplicate values', 'NULL values', 'Only unique, non-NULL values', 'Only numbers'], answer: 2, why: 'A primary key must be unique and NOT NULL. It can be text, not just numbers.' },
      { q: 'What is the second-highest salary query usually built with?', code: 'SELECT MAX(salary) FROM emp\nWHERE salary < (SELECT MAX(salary) FROM emp);', options: ['A subquery', 'A trigger', 'A view', 'An index'], answer: 0, why: 'The inner query finds the top salary; the outer MAX picks the largest one below it.' },
      { q: 'Which normal form removes partial dependency on a composite key?', options: ['1NF', '2NF', '3NF', 'BCNF'], answer: 1, why: '2NF requires every non-key column to depend on the whole composite key, not part of it.' },
      { q: 'Which keyword removes duplicate rows from a result?', options: ['UNIQUE', 'DISTINCT', 'DIFFERENT', 'GROUP'], answer: 1, why: 'SELECT DISTINCT returns each distinct row once.' },
    ],
  },
  {
    id: 'qz-aptitude-warmup', pin: '615204', ownerId: 'u-demo', ownerName: 'Ms. Deshpande',
    title: 'Aptitude Warm-up', topic: 'Aptitude', colour: 'tomato', seconds: 30, shuffle: false, published: true,
    description: 'Percentages, speed and logic: the first round of most campus drives.',
    questions: [
      { q: 'A phone costs ₹12,000 after a 20% discount. What was the original price?', options: ['₹14,400', '₹15,000', '₹14,000', '₹16,000'], answer: 1, why: '80% of the price is ₹12,000, so the full price is 12,000 ÷ 0.8 = ₹15,000.' },
      { q: 'A bus covers 180 km in 3 hours. How far does it go in 50 minutes at the same speed?', options: ['45 km', '50 km', '55 km', '60 km'], answer: 1, why: 'Speed is 60 km/h, i.e. 1 km per minute, so 50 minutes covers 50 km.' },
      { q: 'What comes next? 2, 6, 12, 20, 30, …', options: ['40', '42', '44', '36'], answer: 1, why: 'The gaps grow by 2 (4, 6, 8, 10), so the next gap is 12: 30 + 12 = 42.' },
      { q: 'If 5 people finish a job in 12 days, how many days do 6 people take?', options: ['10', '14', '9', '11'], answer: 0, why: 'The job is 60 person-days. 60 ÷ 6 = 10 days.' },
      { q: 'Ravi is 4th from the front and 9th from the back of a line. How many people are in the line?', options: ['13', '12', '11', '14'], answer: 1, why: '4 + 9 − 1 = 12, because Ravi is counted twice.' },
      { q: 'The ratio of boys to girls in a class is 3 : 5. There are 40 students. How many girls?', options: ['15', '24', '25', '20'], answer: 2, why: '5 of every 8 students are girls: 40 × 5/8 = 25.' },
      { q: 'Simple interest on ₹8,000 at 5% a year for 3 years is…', options: ['₹1,000', '₹1,200', '₹1,400', '₹1,260'], answer: 1, why: 'SI = P × R × T / 100 = 8,000 × 5 × 3 / 100 = ₹1,200.' },
      { q: 'All coders are tea lovers. Some tea lovers are singers. Which must be true?', options: ['All coders are singers', 'Some coders are singers', 'No coder is a singer', 'None of these must be true'], answer: 3, why: 'The singers among tea lovers may or may not include any coders, so no conclusion is forced.' },
    ],
  },
  {
    id: 'qz-web-basics', pin: '730558', ownerId: 'u-demo', ownerName: 'Ms. Deshpande',
    title: 'Web Basics: HTML & CSS', topic: 'Web', colour: 'jade', seconds: 20, shuffle: true, published: true,
    description: 'Tags, the box model and layout, for the web-tech practical.',
    questions: [
      { q: 'Which tag makes the biggest default heading?', options: ['<head>', '<h6>', '<h1>', '<header>'], answer: 2, why: '<h1> is the top-level heading. <head> holds page metadata and is not shown.' },
      { q: 'In the CSS box model, which sits between the border and the content?', options: ['Margin', 'Padding', 'Outline', 'Gap'], answer: 1, why: 'From inside out: content, padding, border, margin.' },
      { q: 'Which selector targets an element with id="cart"?', options: ['.cart', '#cart', 'cart', '*cart'], answer: 1, why: '# selects by id, . selects by class.' },
      { q: 'Which value makes a container lay its children out in a row with flexbox?', code: '.row { display: ___; }', options: ['block', 'grid-row', 'flex', 'inline'], answer: 2, why: 'display: flex makes children flex items, laid out in a row by default.' },
      { q: 'Which attribute gives an image text for screen readers?', options: ['title', 'alt', 'src', 'label'], answer: 1, why: 'alt describes the image for screen readers and shows if the image fails to load.' },
      { q: 'Which unit is relative to the root element’s font size?', options: ['em', 'px', 'rem', '%'], answer: 2, why: 'rem is relative to the <html> font size; em is relative to the parent’s.' },
      { q: 'Which tag creates a link?', options: ['<link>', '<a>', '<href>', '<url>'], answer: 1, why: '<a href="…"> is a clickable link. <link> connects files like stylesheets in <head>.' },
    ],
  },
];
