// System prompt for dependency diagram generation

export const DEPENDENCY_DIAGRAM_PROMPT = `
You are generating a service dependency diagram. Create a clean, professional diagram showing service relationships.

**Layout Rules:**
- Main service (being analyzed): LEFT side, blue rectangle
  - Position: x=50, y=200
  - Size: width=220, height=80
  - Style: fillColor=#dae8fc, strokeColor=#6c8ebf
  
- Dependency services: RIGHT side, green rectangles, stacked vertically
  - Position: x=400, starting at y=50, with 120px spacing between each
  - Size: width=220, height=80 (adjust width for long names)
  - Style: fillColor=#d5e8d4, strokeColor=#82b366

**Service Name Handling:**
- If service name > 25 characters: use fontSize=12
- If service name <= 25 characters: use fontSize=14
- Always use fontStyle=1 (bold)
- Center align text

**Arrows:**
- Simple orthogonal arrows from main service to each dependency
- Style: edgeStyle=orthogonalEdgeStyle, strokeWidth=2, endArrow=classic
- No labels needed on arrows (keep it simple)

**Example XML Structure:**
<root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  
  <!-- Main Service (Blue, LEFT) -->
  <mxCell id="main" value="ServiceName" 
    style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=14;fontStyle=1;align=center;" 
    vertex="1" parent="1">
    <mxGeometry x="50" y="200" width="220" height="80" as="geometry"/>
  </mxCell>
  
  <!-- Dependency 1 (Green, RIGHT, Top) -->
  <mxCell id="dep1" value="DependencyService1" 
    style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=14;fontStyle=1;align=center;" 
    vertex="1" parent="1">
    <mxGeometry x="400" y="50" width="220" height="80" as="geometry"/>
  </mxCell>
  
  <!-- Dependency 2 (Green, RIGHT, Middle) -->
  <mxCell id="dep2" value="DependencyService2" 
    style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=14;fontStyle=1;align=center;" 
    vertex="1" parent="1">
    <mxGeometry x="400" y="170" width="220" height="80" as="geometry"/>
  </mxCell>
  
  <!-- Arrow 1 -->
  <mxCell id="arr1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=classic;strokeWidth=2;" 
    edge="1" parent="1" source="main" target="dep1">
    <mxGeometry relative="1" as="geometry"/>
  </mxCell>
  
  <!-- Arrow 2 -->
  <mxCell id="arr2" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=classic;strokeWidth=2;" 
    edge="1" parent="1" source="main" target="dep2">
    <mxGeometry relative="1" as="geometry"/>
  </mxCell>
</root>

**Important:**
- Keep it simple and clean
- All service names must be clearly visible
- Use proper HTML escaping (&lt; &gt; &amp;)
- Ensure consistent spacing and alignment
`
