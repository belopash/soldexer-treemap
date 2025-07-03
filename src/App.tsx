import {Group} from '@visx/group'
import {Treemap, hierarchy, stratify, treemapSquarify} from '@visx/hierarchy'
import {Zoom} from '@visx/zoom'
import {RectClipPath} from '@visx/clip-path'
import {calculatePercentageChange, calculatePriceChange} from './mockData'
import {TokenData, useTokensData} from './hooks/useFinancialData'
import {useState} from 'react'

const positiveColor = '#22c55e'
const neutralColor = '#757575'
const negativeColor = '#ff4976'
const backgroundColor = '#0a0a0a'
const textColor = '#fafafa'

interface TreemapNode {
    id: string
    parent?: string
    value: number
    data?: TokenData
    category?: string
    symbol?: string
}

const defaultMargin = {top: 0, left: 0, right: 0, bottom: 0}

const initialTransform = {
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    skewX: 0,
    skewY: 0,
}

interface TooltipData {
    name: string
    symbol: string
    absoluteChange: number
    currentPrice: number
    x: number
    y: number
}

export default function App() {
    const {data: financialData, loading, error, refresh} = useTokensData()
    const [tooltip, setTooltip] = useState<TooltipData | null>(null)

    const width = Math.floor(window.innerWidth * 0.9)
    const height = Math.floor(window.innerHeight * 0.9)
    const margin = defaultMargin

    const xMax = width - margin.left - margin.right
    const yMax = height - margin.top - margin.bottom

    // Convert financial data to hierarchy format for percentage change
    const convertDataToHierarchy = (data: TokenData[]): TreemapNode[] => {
        const nodes: TreemapNode[] = []

        nodes.push({id: 'root', value: 0})

        const categories = [...new Set(data.map((item) => item.category))]

        categories.forEach((category) => {
            nodes.push({
                id: category,
                parent: 'root',
                value: 0,
                category,
            })
        })

        // Add individual tokens with percentage change values
        data.forEach((item) => {
            const value = Math.log10(Math.max(1, Math.abs(calculatePriceChange(item) * 1_000_000)))

            nodes.push({
                id: item.symbol,
                parent: item.category,
                value,
                data: item,
                symbol: item.symbol,
                category: item.category,
            })
        })

        return nodes
    }

    // Prepare data
    const nodes = convertDataToHierarchy(financialData)

    const data = stratify<TreemapNode>()
        .id((d) => d.id)
        .parentId((d) => d.parent)(nodes)
        .sum((d) => d.value || 0)

    const root = hierarchy(data).sort((a, b) => (b.value || 0) - (a.value || 0))

    // Create color scale for percentage changes with smooth interpolation
    const getColor = (percentageChange: number): string => {
        // Clamp values to -10% to +10% range
        const clampedValue = Math.max(-10, Math.min(10, percentageChange))

        if (clampedValue >= 10) return positiveColor
        if (clampedValue <= -10) return negativeColor
        if (clampedValue === 0) return neutralColor

        // Interpolate between colors
        if (clampedValue > 0) {
            // Interpolate between neutral (0%) and positive (10%)
            const ratio = clampedValue / 10
            return interpolateColor(neutralColor, positiveColor, ratio)
        } else {
            // Interpolate between negative (-10%) and neutral (0%)
            const ratio = Math.abs(clampedValue) / 10
            return interpolateColor(neutralColor, negativeColor, ratio)
        }
    }

    // Helper function to interpolate between two hex colors
    const interpolateColor = (color1: string, color2: string, ratio: number): string => {
        const hex1 = color1.replace('#', '')
        const hex2 = color2.replace('#', '')

        const r1 = parseInt(hex1.substr(0, 2), 16)
        const g1 = parseInt(hex1.substr(2, 2), 16)
        const b1 = parseInt(hex1.substr(4, 2), 16)

        const r2 = parseInt(hex2.substr(0, 2), 16)
        const g2 = parseInt(hex2.substr(2, 2), 16)
        const b2 = parseInt(hex2.substr(4, 2), 16)

        const r = Math.round(r1 + (r2 - r1) * ratio)
        const g = Math.round(g1 + (g2 - g1) * ratio)
        const b = Math.round(b1 + (b2 - b1) * ratio)

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
    }

    const handleMouseEnter = (event: React.MouseEvent, tokenData: TokenData) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setTooltip({
            name: tokenData.name,
            symbol: tokenData.symbol,
            absoluteChange: calculatePriceChange(tokenData),
            currentPrice: tokenData.endPrice,
            x: event.clientX,
            y: event.clientY,
        })
    }

    const handleMouseLeave = () => {
        setTooltip(null)
    }

    const handleMouseMove = (event: React.MouseEvent) => {
        if (tooltip) {
            setTooltip(prev => prev ? {...prev, x: event.clientX, y: event.clientY} : null)
        }
    }

    // Handle loading state
    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor,
                    color: textColor,
                    fontSize: '18px',
                    width,
                    height,
                    alignSelf: 'center',
                    justifySelf: 'center',
                    borderRadius: '8px',
                }}
            >
                Loading...
            </div>
        )
    }

    return (
        <Zoom<SVGSVGElement>
            width={width}
            height={height}
            scaleXMin={0.9}
            scaleYMin={0.9}
            initialTransformMatrix={initialTransform}
        >
            {(zoom) => (
                <div
                    style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <svg
                        width={width}
                        height={height}
                        style={{cursor: zoom.isDragging ? 'grabbing' : 'grab', touchAction: 'none'}}
                        ref={zoom.containerRef}
                    >
                        <RectClipPath id="zoom-clip" width={width} height={height} />
                        <rect width={width} height={height} rx={8} fill={backgroundColor} />
                        <g transform={zoom.toString()}>
                            <Treemap<typeof data>
                                top={margin.top}
                                root={root}
                                size={[xMax, yMax]}
                                tile={treemapSquarify}
                                round
                                paddingInner={2}
                                paddingOuter={4}
                                paddingTop={12}
                            >
                                {(treemap) => (
                                    <Group>
                                        {treemap
                                            .descendants()
                                            .reverse()
                                            .map((node, i) => {
                                                const nodeWidth = node.x1 - node.x0
                                                const nodeHeight = node.y1 - node.y0

                                                if (nodeWidth < 1 || nodeHeight < 1) return null

                                                const zoomScale = zoom.transformMatrix.scaleX || 1

                                                return (
                                                    <Group
                                                        key={`node-${i}`}
                                                        top={node.y0 + margin.top}
                                                        left={node.x0 + margin.left}
                                                    >
                                                        {node.depth === 1 && nodeWidth > 60 && nodeHeight > 30 && (
                                                            <text
                                                                x={5}
                                                                y={9}
                                                                fontSize={14}
                                                                fontWeight="bold"
                                                                fill={textColor}
                                                            >
                                                                {node.data.data?.id?.toUpperCase()}
                                                            </text>
                                                        )}

                                                        {node.depth === 2 &&
                                                            node.data.data?.data &&
                                                            (() => {
                                                                const tokenData = node.data.data.data
                                                                const percentageChange =
                                                                    calculatePercentageChange(tokenData)
                                                                const color = getColor(percentageChange)
                                                                const scaledNodeWidth = nodeWidth * zoomScale
                                                                const scaledNodeHeight = nodeHeight * zoomScale

                                                                return (
                                                                    <>
                                                                        <rect
                                                                            width={nodeWidth}
                                                                            height={nodeHeight}
                                                                            fill={color}
                                                                            style={{cursor: 'pointer'}}
                                                                            onMouseEnter={(e) => handleMouseEnter(e, tokenData)}
                                                                            onMouseLeave={handleMouseLeave}
                                                                            onMouseMove={handleMouseMove}
                                                                        />
                                                                        {scaledNodeWidth > 50 &&
                                                                            scaledNodeHeight > 40 && (
                                                                                <>
                                                                                    <text
                                                                                        x={nodeWidth / 2}
                                                                                        y={nodeHeight / 2}
                                                                                        textAnchor="middle"
                                                                                        dominantBaseline="middle"
                                                                                        fontSize={16 / zoomScale}
                                                                                        fontWeight="bold"
                                                                                        fill={textColor}
                                                                                        pointerEvents="none"
                                                                                    >
                                                                                        {tokenData.symbol}
                                                                                    </text>
                                                                                    {scaledNodeHeight > 60 && (
                                                                                        <text
                                                                                            x={nodeWidth / 2}
                                                                                            y={
                                                                                                nodeHeight / 2 +
                                                                                                15 / zoomScale
                                                                                            }
                                                                                            textAnchor="middle"
                                                                                            dominantBaseline="middle"
                                                                                            fontSize={12 / zoomScale}
                                                                                            fontWeight="bold"
                                                                                            fill={textColor}
                                                                                            pointerEvents="none"
                                                                                        >
                                                                                            {`${
                                                                                                percentageChange > 0
                                                                                                    ? '+'
                                                                                                    : ''
                                                                                            }${percentageChange.toFixed(
                                                                                                2
                                                                                            )}%`}
                                                                                        </text>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                    </>
                                                                )
                                                            })()}
                                                    </Group>
                                                )
                                            })}
                                    </Group>
                                )}
                            </Treemap>
                        </g>
                    </svg>
                    {tooltip && (
                        <div
                            style={{
                                position: 'fixed',
                                top: tooltip.y + 10,
                                left: tooltip.x + 10,
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                color: textColor,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                pointerEvents: 'none',
                                zIndex: 1000,
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                        >
                            <div style={{fontWeight: 'bold', marginBottom: '4px'}}>
                                {tooltip.name} ({tooltip.symbol})
                            </div>
                            <div>
                                Current Price: ${tooltip.currentPrice.toFixed(4)}
                            </div>
                            <div style={{
                                color: tooltip.absoluteChange >= 0 ? positiveColor : negativeColor
                            }}>
                                Change: {tooltip.absoluteChange >= 0 ? '+' : ''}${tooltip.absoluteChange.toFixed(4)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Zoom>
    )
}
