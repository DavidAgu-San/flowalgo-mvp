export type Template = {
  title: string;
  description: string;
  notes: string;
};

export const TEMPLATES: Template[] = [
{
  title: 'Binary Search Analysis',
  description: 'Understand why binary search is faster than linear search by repeatedly cutting the search space in half.',
  notes: `Start: Search for a value in a sorted array
Compare the target to the middle element
Target found?
If yes: Return the index
If no: Is the target smaller than the middle?
If yes: Search the left half
If no: Search the right half
Repeat until found or no elements remain
Count how many comparisons were needed
Worst case: f(n) = log₂(n)
Average case: f(n) ≈ log₂(n)
Use the cost function to compare against linear search
End`,
},
{
  title: 'Linear Search Analysis',
  description: 'Measure the cost of checking elements one at a time.',
  notes: `Start: Search for a student ID in a list
Inspect the first element
Match found?
If yes: Return the position
If no: Move to the next element
Repeat for every remaining element
How many items were inspected?
Best case: f(n) = 1
Average case: f(n) = n/2
Worst case: f(n) = n
Compare the result to Binary Search
End`,
},
{
  title: 'Hash Table Insertion',
  description: 'Demonstrates average versus worst-case behavior in hash tables.',
  notes: `Start: Insert a username into a hash table
Compute the hash value
Does the target bucket have space?
If yes: Store the username
If no: Resolve the collision
Collision chain too large?
If yes: Resize the hash table
Rehash all existing entries
Continue insertion
Measure the insertion cost
Average case: f(n) = 1
Worst case: f(n) = n
Amortized case: f(n) = 1
Use the cost function to explain why hash tables are efficient
End`,
},
{
  title: 'Merge Sort Analysis',
  description: 'Visualizes divide-and-conquer sorting by splitting data into smaller pieces.',
  notes: `Start: Sort an unsorted array
Array contains one element?
If yes: Return the array
If no: Split the array into two halves
Recursively sort the left half
Recursively sort the right half
Merge both sorted halves
Count the comparisons performed during merging
Worst case: f(n) = n log n
Average case: f(n) = n log n
Compare the result to Bubble Sort
End`,
},
];
