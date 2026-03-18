const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function belowThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return `${ones[n]} `;
  if (n < 100)
    return `${tens[Math.floor(n / 10)]} ${n % 10 !== 0 ? `${ones[n % 10]} ` : ""}`;
  return `${ones[Math.floor(n / 100)]} Hundred ${belowThousand(n % 100)}`;
}

export function numberToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  const n = Math.floor(Math.abs(amount));
  let result = "";

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) result += `${belowThousand(crore)}Crore `;
  if (lakh) result += `${belowThousand(lakh)}Lakh `;
  if (thousand) result += `${belowThousand(thousand)}Thousand `;
  if (rest) result += belowThousand(rest);

  return `${result.trim()} Rupees Only`;
}
