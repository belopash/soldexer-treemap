import {TokenData} from './hooks/useFinancialData'

// Helper functions for treemap integration
export function calculatePriceChange(data: TokenData): number {
    return data.endPrice - data.startPrice
}

export function calculatePercentageChange(data: TokenData): number {
    return ((data.endPrice - data.startPrice) / data.startPrice) * 100
}

export function calculateMarketValue(data: TokenData): number {
    // Mock market cap calculation (price * arbitrary share count)
    const mockShares = Math.floor(Math.random() * 1000000000) + 100000000 // 100M to 1B shares
    return (data.endPrice * mockShares) / 1000000 // In millions
}

// Convert financial data to treemap format
export function convertToTreemapData(
    data: TokenData[],
    valueType: 'price_change' | 'percentage_change' | 'market_value' | 'price_end' = 'market_value'
) {
    // Group by category
    const categories = [...new Set(data.map((item) => item.category))]

    const labels: string[] = ['Portfolio'] // Root
    const parents: string[] = ['']
    const values: number[] = [0]
    const ids: string[] = ['portfolio']
    const text: string[] = ['Portfolio']

    // Add categories
    categories.forEach((category) => {
        labels.push(category)
        parents.push('Portfolio')
        values.push(0) // Will be sum of children
        ids.push(category.toLowerCase().replace(/\s+/g, '-'))
        text.push(category)
    })

    // Add individual tokens
    data.forEach((item) => {
        let value: number
        let displayText: string

        switch (valueType) {
            case 'price_change':
                value = Math.abs(calculatePriceChange(item))
                displayText = `${item.symbol}<br>Change: $${calculatePriceChange(item).toFixed(2)}`
                break
            case 'percentage_change':
                value = Math.abs(calculatePercentageChange(item))
                displayText = `${item.symbol}<br>Change: ${calculatePercentageChange(item).toFixed(2)}%`
                break
            case 'market_value':
                value = calculateMarketValue(item)
                displayText = `${item.symbol}<br>Market Cap: $${value.toFixed(0)}M`
                break
            case 'price_end':
                value = item.endPrice
                displayText = `${item.symbol}<br>Price: $${item.endPrice.toFixed(2)}`
                break
        }

        labels.push(item.symbol)
        parents.push(item.category)
        values.push(value)
        ids.push(item.symbol.toLowerCase())
        text.push(displayText)
    })

    return {labels, parents, values, ids, text}
}
